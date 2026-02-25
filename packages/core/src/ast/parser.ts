import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as types from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

export interface ExtractedString {
    key: string;
    value: string;
    file: string;
    line: number;
    column: number;
}

export interface ScanOptions {
    filePath: string;
    functionName?: string;
    componentName?: string;
}

export interface ScanResult {
    strings: ExtractedString[];
    errors: string[];
}

/**
 * Extract translation keys from JSX/TSX files using AST parsing
 * Identifies t("string") calls and <T>string</T> components
 */
export class ASTParser {
    private functionName: string;
    private componentName: string;

    constructor(options: ScanOptions) {
        this.functionName = options.functionName || 't';
        this.componentName = options.componentName || 'T';
    }

    /**
     * Parse a file and extract all translation strings
     */
    parseFile(filePath: string): ScanResult {
        const strings: ExtractedString[] = [];
        const errors: string[] = [];

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const result = this.parseContent(content, filePath);
            strings.push(...result.strings);
            errors.push(...result.errors);
        } catch (error) {
            errors.push(`Failed to parse ${filePath}: ${error}`);
        }

        return { strings, errors };
    }

    /**
     * Parse content string and extract translation strings
     */
    parseContent(content: string, filePath: string = 'unknown'): ScanResult {
        const strings: ExtractedString[] = [];
        const errors: string[] = [];

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

            traverse(ast, {
                CallExpression: (nodePath: NodePath<types.CallExpression>) => {
                    const node = nodePath.node;

                    // Check if it's calling the translation function: t("string")
                    if (
                        types.isIdentifier(node.callee) &&
                        node.callee.name === this.functionName &&
                        node.arguments.length > 0
                    ) {
                        const arg = node.arguments[0];
                        if (types.isStringLiteral(arg)) {
                            const location = arg.loc?.start;
                            strings.push({
                                key: arg.value,
                                value: arg.value,
                                file: filePath,
                                line: location?.line || 0,
                                column: location?.column || 0,
                            });
                        }
                    }
                },

                JSXElement: (nodePath: NodePath<types.JSXElement>) => {
                    const node = nodePath.node;

                    // Check if it's the T component: <T>string</T>
                    if (
                        types.isJSXIdentifier(node.openingElement.name) &&
                        node.openingElement.name.name === this.componentName
                    ) {
                        const children = node.children;
                        if (children.length === 1 && types.isJSXText(children[0])) {
                            const text = children[0].value.trim();
                            if (text) {
                                const location = children[0].loc?.start;
                                strings.push({
                                    key: text,
                                    value: text,
                                    file: filePath,
                                    line: location?.line || 0,
                                    column: location?.column || 0,
                                });
                            }
                        }
                    }
                },
            });
        } catch (error) {
            errors.push(`AST parsing error in ${filePath}: ${error}`);
        }

        return { strings, errors };
    }

    /**
     * Recursively scan a directory for translation strings
     */
    scanDirectory(dirPath: string, extensions: string[] = ['.js', '.jsx', '.ts', '.tsx']): ScanResult {
        const allStrings: ExtractedString[] = [];
        const allErrors: string[] = [];

        const scanRecursive = (currentPath: string) => {
            const entries = fs.readdirSync(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                // Skip node_modules and hidden directories
                if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
                    continue;
                }

                if (entry.isDirectory()) {
                    scanRecursive(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (extensions.includes(ext)) {
                        const result = this.parseFile(fullPath);
                        allStrings.push(...result.strings);
                        allErrors.push(...result.errors);
                    }
                }
            }
        };

        scanRecursive(dirPath);
        return { strings: allStrings, errors: allErrors };
    }
}

export default ASTParser;
