// Main exports - Hooks & Components
export { 
    LokalProvider, 
    useLokal, 
    useTranslate, 
    useLocale, 
    useFormatters, 
    useIsLoading,
    useLazyTranslations,
    useHydrated,
    useSafeTranslations,
    T 
} from './context/LokalContext';

// Standalone translation
export { createTranslate, useStandaloneTranslate } from './hooks/useStandaloneTranslate';

export type { 
    LokalProviderProps, 
    TranslateFunction, 
    ExtendedTranslateFunction,
    StorageInterface,
    LokalContextValue,
    PluralParams,
    PluralCategory,
    GenderParams,
    GenderCategory,
    DateFormatOptions,
    NumberFormatOptions
} from './context/LokalContext';

// Re-export types from lokal-core
export type { LocaleData } from 'lokal-core';
