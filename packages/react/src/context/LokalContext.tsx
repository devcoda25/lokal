import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { LocaleData } from '@devcoda/lokal-core';

// ============================================
// Type Definitions
// ============================================

// Type for translation function
export type TranslateFunction = <K extends string>(
    key: K,
    params?: Record<string, string | number>
) => string;

// Pluralization types
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export interface PluralParams {
    count: number;
    [key: string]: string | number;
}

// Gender types
export type GenderCategory = 'male' | 'female' | 'other';

export interface GenderParams {
    gender: GenderCategory;
    [key: string]: string | number;
}

// Extended translation function with pluralization and gender
export interface ExtendedTranslateFunction {
    // Basic translation
    <K extends string>(key: K, params?: Record<string, string | number>): string;

    // Pluralization - use key like "items_plural" with {count}
    plural: <K extends string>(key: K, params: PluralParams) => string;

    // Gender - use key like "user_gender" with {gender}
    gender: <K extends string>(key: K, params: GenderParams) => string;

    // Choice/select - use key like "color_choice" with {value}
    choice: <K extends string>(key: K, params: { value: string | number }) => string;
}

// Storage interface for different platforms
export interface StorageInterface {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
}

// Date formatting options
export interface DateFormatOptions {
    year?: 'numeric' | '2-digit';
    month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
    day?: 'numeric' | '2-digit';
    hour?: 'numeric' | '2-digit';
    minute?: 'numeric' | '2-digit';
    second?: 'numeric' | '2-digit';
    timeZoneName?: 'short' | 'long';
}

// Number formatting options
export interface NumberFormatOptions {
    style?: 'decimal' | 'currency' | 'percent' | 'unit';
    currency?: string;
    currencyDisplay?: 'symbol' | 'code' | 'name';
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
    unit?: string;
    unitDisplay?: 'long' | 'short' | 'narrow';
}

// ============================================
// Context Value
// ============================================

export interface LokalContextValue {
    locale: string;
    setLocale: (locale: string) => void;
    locales: string[];
    t: ExtendedTranslateFunction;
    translations: LocaleData;
    isLoading: boolean;
    // Date/Number formatting
    formatDate: (date: Date | string, options?: DateFormatOptions) => string;
    formatNumber: (num: number, options?: NumberFormatOptions) => string;
}

// ============================================
// Context Creation
// ============================================

const LokalContext = createContext<LokalContextValue | null>(null);

// ============================================
// Storage Interface
// ============================================

// Default to localStorage for web
const defaultStorage: StorageInterface = {
    getItem: (key: string) => {
        if (typeof window === 'undefined') return Promise.resolve(null);
        return Promise.resolve(localStorage.getItem(key));
    },
    setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') return Promise.resolve();
        localStorage.setItem(key, value);
        return Promise.resolve();
    },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get plural category based on locale and count
 */
function getPluralCategory(locale: string, count: number): PluralCategory {
    // CLDR plural rules implementation
    const rules: Record<string, (n: number) => PluralCategory> = {
        en: (n) => n === 1 ? 'one' : 'other',
        fr: (n) => n === 0 || n === 1 ? 'one' : 'many',
        es: (n) => n === 1 ? 'one' : 'many',
        de: (n) => n === 1 ? 'one' : 'other',
        it: (n) => n === 1 ? 'one' : 'other',
        ru: (n) => {
            const mod10 = n % 10;
            const mod100 = n % 100;
            if (n === 1) return 'one';
            if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'few';
            if (mod10 === 0 || mod10 >= 5 || mod10 >= 11 && mod10 <= 15) return 'many';
            return 'other';
        },
        ar: (n) => {
            if (n === 0) return 'zero';
            if (n === 1) return 'one';
            if (n === 2) return 'two';
            const mod100 = n % 100;
            if (mod100 >= 3 && mod100 <= 10) return 'few';
            if (mod100 >= 11 && mod100 <= 99) return 'many';
            return 'other';
        },
    };

    const rule = rules[locale] || rules['en'];
    return rule(count);
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): string {
    const keys = path.split('.');
    let value: any = obj;

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return '';
        }
    }

    return typeof value === 'string' ? value : '';
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj: any, path: string, value: string): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) {
            current[key] = {};
        }
        current = current[key];
    }

    current[keys[keys.length - 1]] = value;
}

// ============================================
// Provider Props
// ============================================

export interface LokalProviderProps {
    children: ReactNode;
    locale?: string;
    locales?: string[];
    translations?: LocaleData;
    storage?: StorageInterface;
    namespace?: string;
    defaultLocale?: string;
    onLocaleChange?: (locale: string) => void;
    // SSR Support
    initialLocale?: string;
    initialTranslations?: LocaleData;
    fallbackLocale?: string;
}

interface StoredTranslations {
    [locale: string]: LocaleData;
}

// ============================================
// LokalProvider Component
// ============================================

export function LokalProvider({
    children,
    locale: initialLocale = 'en',
    locales = ['en'],
    translations: initialTranslations = {},
    storage = defaultStorage,
    namespace = 'locales',
    defaultLocale = 'en',
    onLocaleChange,
    initialLocale: ssrInitialLocale,
    initialTranslations: ssrInitialTranslations,
    fallbackLocale = 'en',
}: LokalProviderProps) {
    // Use SSR initial values if provided, otherwise use client-side state
    const [locale, setLocaleState] = useState<string>(ssrInitialLocale || initialLocale);
    const [translations, setTranslations] = useState<LocaleData>(ssrInitialTranslations || initialTranslations);
    const [isLoading, setIsLoading] = useState<boolean>(!!ssrInitialLocale);
    const [isHydrated, setIsHydrated] = useState<boolean>(!!ssrInitialLocale);

    // Handle hydration for SSR
    useEffect(() => {
        if (ssrInitialLocale && !isHydrated) {
            setIsHydrated(true);
            setIsLoading(false);
        }
    }, [ssrInitialLocale, isHydrated]);

    // Load saved locale and translations from storage
    useEffect(() => {
        const loadLocale = async () => {
            try {
                const savedLocale = await storage.getItem(`${namespace}-locale`);
                if (savedLocale && locales.includes(savedLocale)) {
                    setLocaleState(savedLocale);
                } else if (!ssrInitialLocale) {
                    // Try to detect from browser
                    if (typeof navigator !== 'undefined') {
                        const browserLocale = navigator.language.split('-')[0];
                        if (locales.includes(browserLocale)) {
                            setLocaleState(browserLocale);
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to load locale from storage:', error);
                if (!ssrInitialLocale) {
                    setLocaleState(fallbackLocale);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadLocale();
    }, [storage, locales, namespace, ssrInitialLocale, fallbackLocale]);

    // Load translations for current locale
    useEffect(() => {
        const loadTranslations = async () => {
            try {
                const storedData = await storage.getItem(`${namespace}-translations`);
                if (storedData) {
                    const parsed: StoredTranslations = JSON.parse(storedData);
                    if (parsed[locale]) {
                        setTranslations(parsed[locale]);
                    }
                }
            } catch (error) {
                console.warn('Failed to load translations from storage:', error);
            }
        };

        if (!isLoading && !ssrInitialTranslations) {
            loadTranslations();
        }
    }, [locale, storage, namespace, isLoading, ssrInitialTranslations]);

    // Set locale and persist
    const setLocale = useCallback((newLocale: string) => {
        if (!locales.includes(newLocale)) {
            console.warn(`Locale ${newLocale} is not in the list of available locales`);
            return;
        }

        setLocaleState(newLocale);
        storage.setItem(`${namespace}-locale`, newLocale).catch(console.warn);

        if (onLocaleChange) {
            onLocaleChange(newLocale);
        }
    }, [locales, storage, namespace, onLocaleChange]);

    // Basic translation function
    const translate = useCallback((key: string, params?: Record<string, string | number>): string => {
        const value = getNestedValue(translations, key);

        if (!value) {
            // Return key if not found
            return key;
        }

        // Replace parameters
        if (params) {
            return Object.entries(params).reduce(
                (str, [paramKey, paramValue]) => str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
                value
            );
        }

        return value;
    }, [translations]);

    // Extended translation function with pluralization
    const translatePlural = useCallback((key: string, params: PluralParams): string => {
        const { count, ...restParams } = params;
        const pluralCategory = getPluralCategory(locale, count);

        // Try plural-specific key first (e.g., "items_one", "items_other")
        const pluralKey = `${key}_${pluralCategory}`;
        let value = getNestedValue(translations, pluralKey);

        // Fall back to base key if plural form not found
        if (!value) {
            value = getNestedValue(translations, key);
        }

        if (!value) {
            return key;
        }

        // Replace all parameters including count
        const allParams = { count, ...restParams };
        return Object.entries(allParams).reduce(
            (str, [paramKey, paramValue]) => str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
            value
        );
    }, [locale, translations]);

    // Extended translation function with gender
    const translateGender = useCallback((key: string, params: GenderParams): string => {
        const { gender, ...restParams } = params;

        // Try gender-specific key first (e.g., "user_male", "user_female")
        const genderKey = `${key}_${gender}`;
        let value = getNestedValue(translations, genderKey);

        // Fall back to base key if gender form not found
        if (!value) {
            value = getNestedValue(translations, key);
        }

        if (!value) {
            return key;
        }

        // Replace all parameters including gender
        const allParams = { gender, ...restParams };
        return Object.entries(allParams).reduce(
            (str, [paramKey, paramValue]) => str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
            value
        );
    }, [translations]);

    // Choice/select translation
    const translateChoice = useCallback((key: string, params: { value: string | number }): string => {
        const { value } = params;

        // Try value-specific key first (e.g., "color_red", "color_blue")
        const choiceKey = `${key}_${value}`;
        let translation = getNestedValue(translations, choiceKey);

        // Fall back to base key if choice not found
        if (!translation) {
            translation = getNestedValue(translations, key);
        }

        if (!translation) {
            return key;
        }

        return translation;
    }, [translations]);

    // Extended translate function
    const t = useCallback<ExtendedTranslateFunction>(Object.assign(
        translate,
        {
            plural: translatePlural,
            gender: translateGender,
            choice: translateChoice,
        }
    ), [translate, translatePlural, translateGender, translateChoice]);

    // Date formatting
    const formatDate = useCallback((date: Date | string, options?: DateFormatOptions): string => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        try {
            return new Intl.DateTimeFormat(locale, options as Intl.DateTimeFormatOptions).format(dateObj);
        } catch (error) {
            console.warn('Date formatting failed:', error);
            return dateObj.toLocaleDateString();
        }
    }, [locale]);

    // Number formatting
    const formatNumber = useCallback((num: number, options?: NumberFormatOptions): string => {
        try {
            return new Intl.NumberFormat(locale, options as Intl.NumberFormatOptions).format(num);
        } catch (error) {
            console.warn('Number formatting failed:', error);
            return num.toString();
        }
    }, [locale]);

    const contextValue: LokalContextValue = {
        locale,
        setLocale,
        locales,
        t,
        translations,
        isLoading,
        formatDate,
        formatNumber,
    };

    return (
        <LokalContext.Provider value={contextValue}>
            {children}
        </LokalContext.Provider>
    );
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to access the full Lokal context
 */
export function useLokal(): LokalContextValue {
    const context = useContext(LokalContext);

    if (!context) {
        throw new Error('useLokal must be used within a LokalProvider');
    }

    return context;
}

/**
 * Hook to access only the translation function
 */
export function useTranslate(): ExtendedTranslateFunction {
    const { t } = useLokal();
    return t;
}

/**
 * Hook to access locale and setter
 */
export function useLocale(): { locale: string; setLocale: (locale: string) => void; locales: string[] } {
    const { locale, setLocale, locales } = useLokal();
    return { locale, setLocale, locales };
}

/**
 * Hook to access date/number formatters
 */
export function useFormatters(): { formatDate: (date: Date | string, options?: DateFormatOptions) => string; formatNumber: (num: number, options?: NumberFormatOptions) => string } {
    const { formatDate, formatNumber } = useLokal();
    return { formatDate, formatNumber };
}

/**
 * Hook to check if translations are loading
 */
export function useIsLoading(): boolean {
    const { isLoading } = useLokal();
    return isLoading;
}

// ============================================
// T Component JSX Trans forlations
// ============================================

interface TComponentProps {
    children: string;
    params?: Record<string, string | number>;
    plural?: number;
    gender?: GenderCategory;
    className?: string;
    as?: React.ElementType;
}

/**
 * T Component - Translate content directly in JSX
 * Usage: <T>hello_world</T> or <T params={{name: 'John'}}>greeting</T>
 */
export function T({
    children,
    params,
    plural,
    gender,
    className,
    as: Component = 'span'
}: TComponentProps) {
    const { t } = useLokal();

    let translatedText: string;

    if (plural !== undefined) {
        translatedText = t.plural(children, { count: plural, ...(params || {}) });
    } else if (gender) {
        translatedText = t.gender(children, { gender, ...(params || {}) });
    } else {
        translatedText = t(children as any, params);
    }

    return (
        <Component className={className}>
            {translatedText}
        </Component>
    );
}

// ============================================
// Lazy Translation Hook
// ============================================

/**
 * Hook for lazy-loaded translations (useful for code splitting)
 */
export function useLazyTranslations(namespace: string) {
    const { t, translations, isLoading } = useLokal();

    const translate = useCallback((key: string, params?: Record<string, string | number>): string => {
        const namespacedKey = `${namespace}.${key}`;
        const value = getNestedValue(translations, namespacedKey);

        if (!value) {
            return key;
        }

        if (params) {
            return Object.entries(params).reduce(
                (str, [paramKey, paramValue]) =>
                    str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
                value
            );
        }

        return value;
    }, [translations, namespace]);

    return { t: translate, isLoading };
}

// ============================================
// SSR Hydration Helper
// ============================================

/**
 * Hook to handle SSR hydration
 * Returns true until client-side hydration is complete
 */
export function useHydrated(): boolean {
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setHydrated(true);
    }, []);

    return hydrated;
}

/**
 * Hook to get translations only after hydration
 * Prevents hydration mismatches
 */
export function useSafeTranslations(): { t: ExtendedTranslateFunction; isHydrated: boolean } {
    const { t } = useLokal();
    const isHydrated = useHydrated();
    
    // Simple wrapper that returns key during SSR to prevent mismatch
    const safeT = (key: string, params?: Record<string, string | number>): string => {
        if (!isHydrated) {
            return key;
        }
        return t(key, params);
    };
    
    safeT.plural = (key: string, params: PluralParams): string => {
        if (!isHydrated) return key;
        return t.plural(key, params);
    };
    
    safeT.gender = (key: string, params: GenderParams): string => {
        if (!isHydrated) return key;
        return t.gender(key, params);
    };
    
    safeT.choice = (key: string, params: { value: string | number }): string => {
        if (!isHydrated) return key;
        return t.choice(key, params);
    };
    
    return { t: safeT as ExtendedTranslateFunction, isHydrated };
}

// ============================================
// Default Export
// ============================================

export default LokalContext;
