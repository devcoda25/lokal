import { OpenAIProvider, GeminiProvider, TranslationProviderFactory, AITranslator } from './translator';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TranslationProviderFactory', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('OpenAIProvider', () => {
        it('should translate text successfully', async () => {
            const provider = new OpenAIProvider('test-key', 'gpt-4');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{
                        message: {
                            content: 'Hola mundo'
                        }
                    }]
                })
            });

            const result = await provider.translate({
                sourceText: 'Hello world',
                sourceLocale: 'en',
                targetLocale: 'es'
            });

            expect(result.success).toBe(true);
            expect(result.translatedText).toBe('Hola mundo');
            expect(result.sourceText).toBe('Hello world');
        });

        it('should handle API errors', async () => {
            const provider = new OpenAIProvider('test-key');

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: () => Promise.resolve('Unauthorized')
            });

            const result = await provider.translate({
                sourceText: 'Hello',
                sourceLocale: 'en',
                targetLocale: 'es'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('OpenAI API error');
        });

        it('should handle empty response', async () => {
            const provider = new OpenAIProvider('test-key');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: []
                })
            });

            const result = await provider.translate({
                sourceText: 'Hello',
                sourceLocale: 'en',
                targetLocale: 'es'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('No translation returned');
        });
    });

    describe('GeminiProvider', () => {
        it('should translate text successfully', async () => {
            const provider = new GeminiProvider('test-key', 'gemini-2.5-flash');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    candidates: [{
                        content: {
                            parts: [{
                                text: 'Hola mundo'
                            }]
                        }
                    }]
                })
            });

            const result = await provider.translate({
                sourceText: 'Hello world',
                sourceLocale: 'en',
                targetLocale: 'es'
            });

            expect(result.success).toBe(true);
            expect(result.translatedText).toBe('Hola mundo');
        });

        it('should send API key in header (security test)', async () => {
            const provider = new GeminiProvider('secure-api-key');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    candidates: [{
                        content: { parts: [{ text: 'Test' }] }
                    }]
                })
            });

            await provider.translate({
                sourceText: 'Hello',
                sourceLocale: 'en',
                targetLocale: 'es'
            });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'x-goog-api-key': 'secure-api-key'
                    })
                })
            );

            // Verify API key is NOT in URL
            const callUrl = mockFetch.mock.calls[0][0];
            expect(callUrl).not.toContain('key=');
        });

        it('should handle API errors', async () => {
            const provider = new GeminiProvider('test-key');

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                text: () => Promise.resolve('Forbidden')
            });

            const result = await provider.translate({
                sourceText: 'Hello',
                sourceLocale: 'en',
                targetLocale: 'es'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Gemini API error');
        });
    });

    describe('Prompt Injection Protection', () => {
        it('should escape HTML in prompt (OpenAI)', async () => {
            const provider = new OpenAIProvider('test-key');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Test' } }]
                })
            });

            // Attempt prompt injection via sourceText
            await provider.translate({
                sourceText: '<script>alert("xss")</script>',
                sourceLocale: 'en',
                targetLocale: 'es',
                context: 'test.key'
            });

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            const userMessage = callBody.messages.find((m: any) => m.role === 'user').content;

            // Verify HTML entities are escaped
            expect(userMessage).toContain('<');
            expect(userMessage).toContain('>');
            expect(userMessage).not.toContain('<script>');
        });

        it('should escape HTML in prompt (Gemini)', async () => {
            const provider = new GeminiProvider('test-key');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    candidates: [{ content: { parts: [{ text: 'Test' }] } }]
                })
            });

            await provider.translate({
                sourceText: '"><img src=x onerror=alert(1)>',
                sourceLocale: 'en',
                targetLocale: 'es',
                context: 'malicious.key'
            });

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            const textContent = callBody.contents[0].parts[0].text;

            // Verify HTML entities are escaped
            expect(textContent).toContain('>');
            expect(textContent).toContain('<');
            expect(textContent).not.toContain('><img');
        });

        it('should use XML tags for prompt structure', async () => {
            const provider = new OpenAIProvider('test-key');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Test' } }]
                })
            });

            await provider.translate({
                sourceText: 'Hello',
                sourceLocale: 'en',
                targetLocale: 'es',
                context: 'greeting'
            });

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            const userMessage = callBody.messages.find((m: any) => m.role === 'user').content;

            // Verify XML tags are used
            expect(userMessage).toContain('<text>');
            expect(userMessage).toContain('</text>');
            expect(userMessage).toContain('<context>');
            expect(userMessage).toContain('</context>');
        });
    });

    describe('AITranslator', () => {
        it('should translate missing keys', async () => {
            // Create a mock provider
            const mockProvider = {
                translate: jest.fn().mockResolvedValue({
                    success: true,
                    translatedText: 'Hola',
                    sourceText: 'Hello'
                }),
                translateBatch: jest.fn().mockResolvedValue([
                    { success: true, translatedText: 'Hola', sourceText: 'Hello' }
                ])
            };

            const translator = new AITranslator(mockProvider);

            const sourceData = { greeting: 'Hello' };
            const targetData: any = {};

            const result = await translator.translateMissingKeys(
                sourceData,
                targetData,
                'en',
                'es'
            );

            expect(result.greeting).toBe('Hola');
        });

        it('should skip already translated keys', async () => {
            const mockProvider = {
                translate: jest.fn(),
                translateBatch: jest.fn().mockResolvedValue([])
            };

            const translator = new AITranslator(mockProvider);

            const sourceData = { greeting: 'Hello' };
            const targetData = { greeting: 'Hola' }; // Already translated

            await translator.translateMissingKeys(
                sourceData,
                targetData,
                'en',
                'es'
            );

            // Should not call translation since already done
            expect(mockProvider.translateBatch).not.toHaveBeenCalled();
        });

        it('should handle null context safely', async () => {
            const mockProvider = {
                translate: jest.fn().mockResolvedValue({
                    success: true,
                    translatedText: 'Test',
                    sourceText: 'Test'
                }),
                translateBatch: jest.fn().mockResolvedValue([
                    { success: true, translatedText: 'Test', sourceText: 'Test' }
                ])
            };

            const translator = new AITranslator(mockProvider);

            // This should not throw even if context is somehow missing
            await expect(
                translator.translateMissingKeys(
                    { key: 'value' },
                    {},
                    'en',
                    'es'
                )
            ).resolves.not.toThrow();
        });
    });

    describe('Factory', () => {
        it('should create OpenAI provider', () => {
            const provider = TranslationProviderFactory.create('openai', 'key', 'gpt-4');
            expect(provider).toBeInstanceOf(OpenAIProvider);
        });

        it('should create Gemini provider', () => {
            const provider = TranslationProviderFactory.create('gemini', 'key', 'gemini-pro');
            expect(provider).toBeInstanceOf(GeminiProvider);
        });

        it('should throw on unknown provider', () => {
            expect(() => {
                TranslationProviderFactory.create('unknown' as any, 'key');
            }).toThrow('Unknown translation provider');
        });
    });
});
