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
     * Wrap strings in a file
     */
    wrapFile(filePath: string): WrapResult {
        const wrapped: WrappedString[] = [];
        const errors: string[] = [];

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const result = this.wrapContent(content, filePath);
            wrapped.push(...result.wrapped);
            errors.push(...result.errors);
        } catch (error) {
            errors.push(`Failed to process ${filePath}: ${error}`);
        }

        return {
            file: filePath,
            wrapped,
            errors,
            modified: wrapped.length > 0
        };
    }

    /**
     * Wrap strings in content
     */
    wrapContent(content: string, filePath: string = 'unknown'): WrapResult {
        const wrapped: WrappedString[] = [];
        const errors: string[] = [];
        let modified = false;

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

            // Track replacements to avoid duplicates
            const processedNodes = new Set<string>();

            traverse(ast, {
                // Handle JSX text: <div>Hello World</div>
                JSXText: (nodePath: NodePath<types.JSXText>) => {
                    const node = nodePath.node;
                    const text = node.value.trim();
                    const nodeKey = `${nodePath.key}-${node.loc?.start.line}-${node.loc?.start.column}`;

                    if (this.shouldExclude(text) || processedNodes.has(nodeKey)) {
                        return;
                    }
                    processedNodes.add(nodeKey);

                    // Check if parent already has t() wrapper
                    const parent = nodePath.parent;
                    if (types.isCallExpression(parent)) return;
                    if (types.isJSXExpressionContainer(parent)) return;

                    const key = this.generateKey(text, filePath);
                    const location = node.loc?.start;

                    wrapped.push({
                        original: text,
                        wrapped: `{${this.functionName}('${key}')}`,
                        key,
                        line: location?.line || 0
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
                JSXAttribute: (nodePath: NodePath<types.JSXAttribute>) => {
                    const node = nodePath.node;

                    // Only process string literals
                    if (!types.isStringLiteral(node.value)) return;

                    const text = node.value.value;
                    const nodeKey = `${nodePath.key}-${node.loc?.start.line}-${node.loc?.start.column}`;

                    // Skip certain attributes that shouldn't be translated
                    const attrName = types.isJSXIdentifier(node.name) ? node.name.name : '';
                    if (['className', 'id', 'src', 'href', 'alt', 'role'].includes(attrName)) {
                        return;
                    }

                    if (this.shouldExclude(text) || processedNodes.has(nodeKey)) {
                        return;
                    }
                    processedNodes.add(nodeKey);

                    const key = this.generateKey(text, filePath);
                    const location = node.loc?.start;

                    wrapped.push({
                        original: text,
                        wrapped: `${this.functionName}('${key}')`,
                        key,
                        line: location?.line || 0
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
                },

                // Handle string arguments in functions: console.log("Hello")
                StringLiteral: (nodePath: NodePath<types.StringLiteral>) => {
                    const node = nodePath.node;
                    const text = node.value;
                    const nodeKey = `${nodePath.key}-${node.loc?.start.line}-${node.loc?.start.column}`;

                    // Skip if already inside a t() call
                    let insideTranslation = false;
                    let parent = nodePath.parent;
                    while (parent) {
                        if (types.isCallExpression(parent)) {
                            const callee = parent.callee;
                            if (types.isIdentifier(callee) && callee.name === this.functionName) {
                                insideTranslation = true;
                                break;
                            }
                        }
                        parent = parent.parent as any;
                    }
                    if (insideTranslation) return;

                    // Only process specific contexts (like children, props)
                    const grandParent = nodePath.parent?.parent;
                    if (!grandParent || !types.isJSXElement(grandParent)) {
                        return;
                    }

                    if (this.shouldExclude(text) || processedNodes.has(nodeKey)) {
                        return;
                    }
                    processedNodes.add(nodeKey);

                    const key = this.generateKey(text, filePath);
                    const location = node.loc?.start;

                    wrapped.push({
                        original: text,
                        wrapped: `${this.functionName}('${key}')`,
                        key,
                        line: location?.line || 0
                    });

                    // Replace with function call
                    nodePath.replaceWith(
                        types.callExpression(
                            types.identifier(this.functionName),
                            [types.stringLiteral(key)]
                        )
                    );
                    modified = true;
                }
            });

            // Generate modified content
            if (modified) {
                const generate = require('@babel/generator').default;
                const output = generate(ast, {}, content);
                return {
                    file: filePath,
                    wrapped,
                    errors: [],
                    modified: true,
                    // Attach modified content for later retrieval
                } as any;
            }
        } catch (error) {
            errors.push(`AST wrapping error in ${filePath}: ${error}`);
        }

        return { file: filePath, wrapped, errors, modified };
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
