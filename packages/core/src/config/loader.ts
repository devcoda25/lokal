import { cosmiconfig } from 'cosmiconfig';
import * as fs from 'fs';
import * as path from 'path';
import deepmerge from 'deepmerge';

export interface LokalConfig {
    locales: string[];
    defaultLocale: string;
    functionName: string;
    componentName: string;
    sourceDir: string;
    outputDir: string;
    ai?: {
        provider: 'openai' | 'gemini';
        apiKey?: string;
        model?: string;
    };
}

export const defaultConfig: LokalConfig = {
    locales: ['en'],
    defaultLocale: 'en',
    functionName: 't',
    componentName: 'T',
    sourceDir: './src',
    outputDir: './locales',
};

/**
 * Load and merge configuration from lokal.config.js or package.json
 */
export class ConfigLoader {
    private configPath: string | null = null;

    /**
     * Search for config file and load it
     */
    async load(searchFrom: string = process.cwd()): Promise<LokalConfig> {
        const explorer = cosmiconfig('lokal', {
            searchPlaces: [
                'lokal.config.js',
                'lokal.config.ts',
                'lokal.config.cjs',
                'lokal.config.json',
                'package.json',
            ],
        });

        try {
            const result = await explorer.search(searchFrom);

            if (result && result.config) {
                this.configPath = result.filepath;
                return this.mergeWithDefaults(result.config as Partial<LokalConfig>);
            }
        } catch (error) {
            console.warn(`Config search failed: ${error}`);
        }

        return defaultConfig;
    }

    /**
     * Load config synchronously from a specific path
     */
    loadSync(configPath: string): LokalConfig {
        if (!fs.existsSync(configPath)) {
            return defaultConfig;
        }

        const ext = path.extname(configPath);
        let config: Partial<LokalConfig> = {};

        try {
            if (ext === '.json') {
                const content = fs.readFileSync(configPath, 'utf-8');
                config = JSON.parse(content);
            } else if (ext === '.js' || ext === '.ts' || ext === '.cjs') {
                // For JS/TS configs, we'd need to require them
                // This is a simplified version
                const content = fs.readFileSync(configPath, 'utf-8');

                // Basic JS config parsing - in production would use proper require
                if (content.includes('module.exports') || content.includes('export default')) {
                    // Just return defaults for JS configs in this simplified version
                    // Real implementation would use require or ESM import
                    config = this.parseJsConfig(content);
                }
            }
        } catch (error) {
            console.warn(`Failed to load config from ${configPath}: ${error}`);
        }

        this.configPath = configPath;
        return this.mergeWithDefaults(config);
    }

    /**
     * Parse simple JS config content
     */
    private parseJsConfig(content: string): Partial<LokalConfig> {
        const config: Partial<LokalConfig> = {};

        // Extract locales
        const localesMatch = content.match(/locales:\s*\[(.*?)\]/);
        if (localesMatch) {
            config.locales = localesMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
        }

        // Extract defaultLocale
        const defaultLocaleMatch = content.match(/defaultLocale:\s*['"](\w+)['"]/);
        if (defaultLocaleMatch) {
            config.defaultLocale = defaultLocaleMatch[1];
        }

        // Extract functionName
        const functionNameMatch = content.match(/functionName:\s*['"](\w+)['"]/);
        if (functionNameMatch) {
            config.functionName = functionNameMatch[1];
        }

        // Extract componentName
        const componentNameMatch = content.match(/componentName:\s*['"](\w+)['"]/);
        if (componentNameMatch) {
            config.componentName = componentNameMatch[1];
        }

        // Extract sourceDir
        const sourceDirMatch = content.match(/sourceDir:\s*['"](.+?)['"]/);
        if (sourceDirMatch) {
            config.sourceDir = sourceDirMatch[1];
        }

        // Extract outputDir
        const outputDirMatch = content.match(/outputDir:\s*['"](.+?)['"]/);
        if (outputDirMatch) {
            config.outputDir = outputDirMatch[1];
        }

        return config;
    }

    /**
     * Merge loaded config with defaults
     */
    private mergeWithDefaults(config: Partial<LokalConfig>): LokalConfig {
        return deepmerge(defaultConfig, config, {
            arrayMerge: (_target, source) => source,
        });
    }

    /**
     * Get the loaded config path
     */
    getConfigPath(): string | null {
        return this.configPath;
    }
}

export default ConfigLoader;
