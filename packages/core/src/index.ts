// Core exports
export { ASTParser, type ExtractedString, type ScanOptions, type ScanResult } from './ast/parser';
export { ASTWrapper, type WrapOptions, type WrappedString, type WrapResult } from './ast/wrapper';
export { ConfigLoader, type LokalConfig, defaultConfig } from './config/loader';
export { FileStorage, ContentHasher, type LocaleData, type LocaleFile } from './storage/file-storage';
export { 
  AITranslator, 
  TranslationProviderFactory,
  OpenAIProvider, 
  GeminiProvider,
  type TranslationProvider,
  type TranslationRequest,
  type TranslationResult,
  type TranslationBatch
} from './ai/translator';
