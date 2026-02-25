declare module 'lokal-core' {
    export class ASTParser {
        constructor(options: {
            filePath: string;
            functionName?: string;
            componentName?: string;
        });
        scanDirectory(dirPath: string): ScanResult;
    }

    export interface ExtractedString {
        key: string;
        value: string;
        location?: {
            file: string;
            line: number;
            column: number;
        };
    }

    export interface ScanResult {
        strings: ExtractedString[];
        errors: string[];
    }

    export interface ScanOptions {
        filePath: string;
        functionName?: string;
        componentName?: string;
    }

    export class ConfigLoader {
        load(configPath?: string): Promise<LokalConfig>;
        loadSync(configPath?: string): LokalConfig;
    }

    export interface LokalConfig {
        sourceDir: string;
        outputDir: string;
        defaultLocale: string;
        functionName: string;
        componentName: string;
        locales?: string[];
        ai?: {
            provider: 'openai' | 'gemini';
            apiKey: string;
            model?: string;
        };
    }

    export const defaultConfig: LokalConfig;

    export class FileStorage {
        constructor(outputDir: string);
        loadLocale(locale: string): LocaleFile | null;
        saveLocale(locale: string, data: LocaleData): void;
        mergeLocaleData(locale: string, newData: Record<string, string>): LocaleData;
        getAvailableLocales(): string[];
    }

    export interface LocaleData {
        [key: string]: string;
    }

    export interface LocaleFile {
        locale: string;
        data: LocaleData;
    }

    export class ContentHasher {
        static hash(content: string): string;
    }

    export class AITranslator {
        constructor(provider: TranslationProvider, options?: {
            batchSize?: number;
        });
        translateBatch(request: TranslationBatch): Promise<TranslationResult[]>;
        translateMissingKeys(
            sourceData: Record<string, string>,
            targetData: Record<string, string>,
            sourceLocale: string,
            targetLocale: string
        ): Promise<Record<string, string>>;
    }

    export interface TranslationProvider {
        translate(request: TranslationRequest): Promise<TranslationResult>;
    }

    export interface TranslationRequest {
        text: string;
        sourceLocale: string;
        targetLocale: string;
        context?: string;
    }

    export interface TranslationResult {
        translatedText: string;
        success: boolean;
        error?: string;
    }

    export interface TranslationBatch {
        items: TranslationRequest[];
    }

    export class OpenAIProvider implements TranslationProvider {
        constructor(apiKey: string, options?: {
            model?: string;
            temperature?: number;
        });
        translate(request: TranslationRequest): Promise<TranslationResult>;
    }

    export class GeminiProvider implements TranslationProvider {
        constructor(apiKey: string, options?: {
            model?: string;
            temperature?: number;
        });
        translate(request: TranslationRequest): Promise<TranslationResult>;
    }

    export class TranslationProviderFactory {
        static create(provider: 'openai' | 'gemini', apiKey: string, model?: string): TranslationProvider;
    }
}
