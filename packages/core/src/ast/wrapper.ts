import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as types from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

export interface WrapOptions {
    functionName?: string;
    componentName?: string;
    excludePatterns?: RegExp[];
    keyPrefix?: string;
}

export interface WrappedString {
    original: string;
    wrapped: string;
    key: string;
    line: number;
}

export interface WrapResult {
    file: string;
    wrapped: WrappedString[];
    errors: string[];
    modified: boolean;
    modifiedContent?: string;
}

/**
 * Auto-wrap translatable strings in JSX/TSX files
 * Converts plain text to t("key") or <T>key</T>
 */
export class ASTWrapper {
    private functionName: string;
    private componentName: string;
    private excludePatterns: RegExp[];
    private keyPrefix: string;

    constructor(options: WrapOptions = {}) {
        this.functionName = options.functionName || 't';
        this.componentName = options.componentName || 'T';
        this.excludePatterns = options.excludePatterns || [];
        this.keyPrefix = options.keyPrefix || '';
    }

    /**
     * Generate a key from text content
     */
    generateKey(text: string, filePath: string): string {
        // Clean the text: lowercase, remove special chars, replace spaces with underscores
        const cleaned = text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '_');

        // Get relative path for prefix
        const relativePath = path.basename(filePath, path.extname(filePath));

        // Combine prefix + path + key
        const prefix = this.keyPrefix ? `${this.keyPrefix}_` : '';
        return `${prefix}${relativePath}_${cleaned}`;
    }

    /**
     * Check if text should be excluded
     */
    shouldExclude(text: string): boolean {
        // Skip empty or whitespace-only strings
        if (!text || !text.trim()) return true;

        // Skip very short strings (likely variables)
        if (text.trim().length < 2) return true;

        // Skip strings that look like code/variables
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(text.trim())) return true;

        // Skip URLs
        if (/^https?:\/\//.test(text.trim())) return true;

        // Skip file paths
        if (/^[\/\\]|^[a-zA-Z]:\\/.test(text.trim())) return true;

        // Skip CSS class names
        if (/^\.[a-zA-Z][\w-]*$/.test(text.trim())) return true;

        // Skip strings starting with special characters that indicate code
        if (/^[{}\[\]();]/.test(text.trim())) return true;

        // Check custom exclusion patterns
        for (const pattern of this.excludePatterns) {
            if (pattern.test(text)) return true;
        }

        return false;
    }

    /**
     * Add import statement for t function if not already present
     */
    private addImportStatement(content: string, filePath: string): string {
        const importName = this.functionName;
        
        // Check if import already exists
        const importRegex = new RegExp(`import\\s+{?\\s*${importName}\\s*}?\\s+from`);
        if (importRegex.test(content)) {
            return content;
        }
        
        // Determine the import source based on file type
        const ext = filePath.toLowerCase();
        let importSource = 'react';
        
        // For non-react files, use lokal-core or local file
        if (ext.endsWith('.js') || ext.endsWith('.jsx')) {
            importSource = 'lokal-core';
        }
        
        // Find the first import or the start of file to insert import
        const lines = content.split('\n');
        let insertIndex = 0;
        
        // Find where to insert (after any existing imports)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('import ') || line.startsWith('//') || line.startsWith('/*') || line === '') {
                // Continue looking
                if (line === '' && i > 0 && lines[i-1].trim().startsWith('import ')) {
                    insertIndex = i + 1;
                    break;
                }
            } else {
                insertIndex = i;
                break;
            }
        }
        
        // Build the import statement
        const importStatement = `import { ${importName} } from '${importSource}';\n`;
        
        // Insert the import
        lines.splice(insertIndex, 0, importStatement);
        
        return lines.join('\n');
    }

    /**
     * Wrap strings in a file
     */
    wrapFile(filePath: string): WrapResult {
        const wrapped: WrappedString[] = [];
        const errors: string[] = [];
        let modified = false;

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const result = this.wrapContent(content, filePath);
            wrapped.push(...result.wrapped);
            errors.push(...result.errors);
            modified = result.modified;

            // Write the modified content back to the file
            if (modified && result.modifiedContent) {
                // Use the modified content from wrapContent
                let output = result.modifiedContent;
                
                // Add import for t function if not present
                output = this.addImportStatement(output, filePath);
                
                fs.writeFileSync(filePath, output, 'utf-8');
            }
        } catch (error) {
            errors.push(`Failed to process ${filePath}: ${error}`);
        }

        return {
            file: filePath,
            wrapped,
            errors,
            modified
        };
    }

    /**
     * Wrap strings in content
     */
    wrapContent(content: string, filePath: string = 'unknown'): WrapResult {
        const wrapped: WrappedString[] = [];
        const errors: string[] = [];
        let modified = false;
        let modifiedContent: string | undefined;

        try {
            const ast = parser.parse(content, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    'typescript',
                    'jsx',
                    'exportDefaultFrom',
                    'exportNamespaceFrom',
                    ['decorators', { decoratorsBeforeExport: true }],
                ],
                errorRecovery: true,
            });

            // Track processed locations to avoid duplicates
            const processedLocations = new Set<string>();

            traverse(ast, {
                // Handle JSX text: <div>Hello World</div>
                JSXText: (nodePath: NodePath) => {
                    const node = nodePath.node as types.JSXText;
                    const text = node.value.trim();

                    // Get location for tracking
                    const location = node.loc?.start;
                    if (!location) return;

                    const locationKey = `${location.line}:${location.column}`;
                    if (processedLocations.has(locationKey)) return;
                    processedLocations.add(locationKey);

                    if (this.shouldExclude(text)) {
                        return;
                    }

                    // Check if parent already has t() wrapper
                    const parent = nodePath.parent;
                    if (parent && (types.isCallExpression(parent) || types.isJSXExpressionContainer(parent))) {
                        return;
                    }

                    const key = this.generateKey(text, filePath);

                    wrapped.push({
                        original: text,
                        wrapped: `{${this.functionName}('${key}')}`,
                        key,
                        line: location.line || 0
                    });

                    // Replace the text node
                    nodePath.replaceWith(
                        types.jSXExpressionContainer(
                            types.callExpression(
                                types.identifier(this.functionName),
                                [types.stringLiteral(key)]
                            )
                        )
                    );
                    modified = true;
                },

                // Handle JSX attributes: <div title="Hello"></div>
                JSXAttribute: (nodePath: NodePath) => {
                    const node = nodePath.node as types.JSXAttribute;

                    // Only process string literals
                    if (!types.isStringLiteral(node.value)) return;

                    const text = node.value.value;

                    // Get location for tracking
                    const location = node.loc?.start;
                    if (!location) return;

                    const locationKey = `attr:${location.line}:${location.column}`;
                    if (processedLocations.has(locationKey)) return;
                    processedLocations.add(locationKey);

                    // Skip certain attributes that shouldn't be translated
                    const attrName = types.isJSXIdentifier(node.name) ? node.name.name : '';
                    // SVG attributes - never translate
                    const svgAttributes = ['width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'strokeWidth', 'stroke-width', 'x', 'y', 'cx', 'cy', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points', 'transform', 'preserveAspectRatio', 'borderRadius', 'border-radius'];
                    // CSS/technical attributes - never translate
                    const techAttributes = ['className', 'id', 'src', 'href', 'target', 'rel', 'alt', 'role', 'aria-label', 'aria-describedby'];
                    if ([...svgAttributes, ...techAttributes].includes(attrName)) {
                        return;
                    }
                    
                    // Skip technical values that shouldn't be translated
                    const techValues = ['noopener', 'noreferrer', '_blank', 'self', 'parent', 'top'];
                    const normalizedText = text.toLowerCase().trim();
                    if (techValues.some(v => normalizedText === v || normalizedText.includes(v))) {
                        return;
                    }

                    if (this.shouldExclude(text)) {
                        return;
                    }

                    const key = this.generateKey(text, filePath);

                    wrapped.push({
                        original: text,
                        wrapped: `${this.functionName}('${key}')`,
                        key,
                        line: location.line || 0
                    });

                    // Replace with function call
                    nodePath.replaceWith(
                        types.jSXAttribute(
                            node.name,
                            types.jSXExpressionContainer(
                                types.callExpression(
                                    types.identifier(this.functionName),
                                    [types.stringLiteral(key)]
                                )
                            )
                        )
                    );
                    modified = true;
                }
            });

            // Generate modified content if any changes were made
            if (modified) {
                const generate = require('@babel/generator').default;
                modifiedContent = generate(ast).code;
            }

        } catch (error) {
            errors.push(`AST wrapping error in ${filePath}: ${error}`);
        }

        return { file: filePath, wrapped, errors, modified, modifiedContent };
    }

    /**
     * Wrap strings in a directory
     */
    wrapDirectory(
        dirPath: string,
        extensions: string[] = ['.js', '.jsx', '.ts', '.tsx'],
        dryRun: boolean = false
    ): { results: WrapResult[], modifiedFiles: number } {
        const results: WrapResult[] = [];
        let modifiedFiles = 0;

        const wrapRecursive = (currentPath: string) => {
            const entries = fs.readdirSync(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                // Skip node_modules and hidden directories
                if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
                    continue;
                }

                // Skip Lokal output directory
                if (entry.name === 'locales' || entry.name === '.lokal') {
                    continue;
                }

                if (entry.isDirectory()) {
                    wrapRecursive(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (extensions.includes(ext)) {
                        const result = this.wrapFile(fullPath);
                        results.push(result);
                        if (result.modified) {
                            modifiedFiles++;
                        }
                    }
                }
            }
        };

        wrapRecursive(dirPath);
        return { results, modifiedFiles };
    }
}

export default ASTWrapper;
