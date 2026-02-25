import { LocaleData } from '../storage/file-storage';

export interface TranslationRequest {
    sourceText: string;
    sourceLocale: string;
    targetLocale: string;
    context?: string;
}

export interface TranslationResult {
    translatedText: string;
    sourceText: string;
    success: boolean;
    error?: string;
}

export interface TranslationBatch {
    requests: TranslationRequest[];
    results: TranslationResult[];
}

/**
 * Base interface for AI translation providers
 */
export interface TranslationProvider {
    translate(request: TranslationRequest): Promise<TranslationResult>;
    translateBatch(requests: TranslationRequest[]): Promise<TranslationResult[]>;
}

/**
 * OpenAI translation provider
 */
export class OpenAIProvider implements TranslationProvider {
    private apiKey: string;
    private model: string;
    private baseUrl: string;

    constructor(apiKey: string, model: string = 'gpt-4') {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = 'https://api.openai.com/v1';
    }

    async translate(request: TranslationRequest): Promise<TranslationResult> {
        const prompt = this.buildPrompt(request);

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional translator. Translate the text accurately and naturally.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
            }

            const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
            const translatedText = json.choices?.[0]?.message?.content?.trim();

            if (!translatedText) {
                throw new Error('No translation returned');
            }

            return {
                translatedText,
                sourceText: request.sourceText,
                success: true,
            };
        } catch (error) {
            return {
                translatedText: '',
                sourceText: request.sourceText,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async translateBatch(requests: TranslationRequest[]): Promise<TranslationResult[]> {
        // Process sequentially to avoid rate limits
        const results: TranslationResult[] = [];

        for (const request of requests) {
            const result = await this.translate(request);
            results.push(result);
        }

        return results;
    }

    private buildPrompt(request: TranslationRequest): string {
        let prompt = `Translate the following text from ${request.sourceLocale} to ${request.targetLocale}:\n\n"${request.sourceText}"`;

        if (request.context) {
            prompt += `\n\nContext: ${request.context}`;
        }

        return prompt;
    }
}

/**
 * Gemini (Google) translation provider
 */
export class GeminiProvider implements TranslationProvider {
    private apiKey: string;
    private model: string;
    private baseUrl: string;

    constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
    }

    async translate(request: TranslationRequest): Promise<TranslationResult> {
        const prompt = this.buildPrompt(request);

        try {
            const url = `${this.baseUrl}?key=${this.apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2048,
                    }
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
            }

            const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
            const translatedText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (!translatedText) {
                throw new Error('No translation returned');
            }

            return {
                translatedText,
                sourceText: request.sourceText,
                success: true,
            };
        } catch (error) {
            return {
                translatedText: '',
                sourceText: request.sourceText,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async translateBatch(requests: TranslationRequest[]): Promise<TranslationResult[]> {
        // Process sequentially to avoid rate limits
        const results: TranslationResult[] = [];

        for (const request of requests) {
            const result = await this.translate(request);
            results.push(result);
        }

        return results;
    }

    private buildPrompt(request: TranslationRequest): string {
        let prompt = `Translate the following text from ${request.sourceLocale} to ${request.targetLocale}:\n\n"${request.sourceText}"`;

        if (request.context) {
            prompt += `\n\nContext: ${request.context}`;
        }

        return prompt;
    }
}

/**
 * Factory to create translation providers
 */
export class TranslationProviderFactory {
    static create(provider: 'openai' | 'gemini', apiKey: string, model?: string): TranslationProvider {
        switch (provider) {
            case 'openai':
                return new OpenAIProvider(apiKey, model);
            case 'gemini':
                return new GeminiProvider(apiKey, model);
            default:
                throw new Error(`Unknown translation provider: ${provider}`);
        }
    }
}

/**
 * AI Translation manager with content hashing for incremental sync
 */
export class AITranslator {
    private provider: TranslationProvider;
    private existingHashes: Map<string, string>;

    constructor(provider: TranslationProvider) {
        this.provider = provider;
        this.existingHashes = new Map();
    }

    /**
     * Translate new keys that don't have translations yet
     * Uses content hashing to skip unchanged strings
     */
    async translateMissingKeys(
        sourceData: LocaleData,
        targetData: LocaleData,
        sourceLocale: string,
        targetLocale: string
    ): Promise<LocaleData> {
        const translatedData = { ...targetData };
        const requests: TranslationRequest[] = [];

        // Find keys that need translation
        const sourceKeys = this.flattenKeys(sourceData);

        for (const key of sourceKeys) {
            const sourceValue = this.getValueByKey(sourceData, key);
            const targetValue = this.getValueByKey(targetData, key);

            // Skip if already translated or unchanged
            if (targetValue && targetValue !== sourceValue) {
                continue;
            }

            const contentHash = this.hashString(sourceValue);

            // Skip if hash matches (content hasn't changed)
            if (this.existingHashes.has(key) && this.existingHashes.get(key) === contentHash) {
                continue;
            }

            requests.push({
                sourceText: sourceValue,
                sourceLocale,
                targetLocale,
                context: key,
            });
        }

        // Batch translate
        if (requests.length > 0) {
            const results = await this.provider.translateBatch(requests);

            // Apply translations
            for (let i = 0; i < requests.length; i++) {
                const request = requests[i];
                const result = results[i];

                if (result.success && request.context) {
                    this.setValueByKey(translatedData, request.context, result.translatedText);
                    this.existingHashes.set(request.context, this.hashString(request.sourceText));
                }
            }
        }

        return translatedData;
    }

    /**
     * Flatten nested object to array of keys
     */
    private flattenKeys(obj: LocaleData, prefix: string = ''): string[] {
        const keys: string[] = [];

        for (const key in obj) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];

            if (typeof value === 'string') {
                keys.push(fullKey);
            } else if (typeof value === 'object') {
                keys.push(...this.flattenKeys(value as LocaleData, fullKey));
            }
        }

        return keys;
    }

    /**
     * Get value by dot-notation key
     */
    private getValueByKey(obj: LocaleData, key: string): string {
        const parts = key.split('.');
        let current: any = obj;

        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return '';
            }
        }

        return typeof current === 'string' ? current : '';
    }

    /**
     * Set value by dot-notation key
     */
    private setValueByKey(obj: LocaleData, key: string, value: string): void {
        const parts = key.split('.');
        let current: any = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current)) {
                current[part] = {};
            }
            current = current[part];
        }

        current[parts[parts.length - 1]] = value;
    }

    /**
     * Hash a string
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
}

export default AITranslator;
