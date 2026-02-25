import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { LocaleData } from 'lokal-core';

// Type for translation function
export type TranslateFunction = <K extends string>(
    key: K,
    params?: Record<string, string | number>
) => string;

// Storage interface for different platforms
export interface StorageInterface {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
}

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

export interface LokalContextValue {
    locale: string;
    setLocale: (locale: string) => void;
    locales: string[];
    t: TranslateFunction;
    translations: LocaleData;
    isLoading: boolean;
}

const LokalContext = createContext<LokalContextValue | null>(null);

export interface LokalProviderProps {
    children: ReactNode;
    locale?: string;
    locales?: string[];
    translations?: LocaleData;
    storage?: StorageInterface;
    namespace?: string;
    defaultLocale?: string;
    onLocaleChange?: (locale: string) => void;
}

interface StoredTranslations {
    [locale: string]: LocaleData;
}

/**
 * LokalProvider - Provides localization context to your React app
 */
export function LokalProvider({
    children,
    locale: initialLocale = 'en',
    locales = ['en'],
    translations: initialTranslations = {},
    storage = defaultStorage,
    namespace = 'locales',
    defaultLocale = 'en',
    onLocaleChange,
}: LokalProviderProps) {
    const [locale, setLocaleState] = useState<string>(initialLocale);
    const [translations, setTranslations] = useState<LocaleData>(initialTranslations);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Load saved locale and translations from storage
    useEffect(() => {
        const loadLocale = async () => {
            try {
                const savedLocale = await storage.getItem(`${namespace}-locale`);
                if (savedLocale && locales.includes(savedLocale)) {
                    setLocaleState(savedLocale);
                } else {
                    // Try to detect from browser
                    const browserLocale = navigator.language.split('-')[0];
                    if (locales.includes(browserLocale)) {
                        setLocaleState(browserLocale);
                    }
                }
            } catch (error) {
                console.warn('Failed to load locale from storage:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadLocale();
    }, [storage, locales, namespace]);

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

        if (!isLoading) {
            loadTranslations();
        }
    }, [locale, storage, namespace, isLoading]);

    // Set locale and persist
    const setLocale = useCallback((newLocale: string) => {
        if (!locales.includes(newLocale)) {
            console.warn(`Locale ${newLocale} is not in the list of available locales`);
            return;
        }

        setLocaleState(newLocale);
        storage.setItem(`${namespace}-locale`, newLocale);

        if (onLocaleChange) {
            onLocaleChange(newLocale);
        }
    }, [locales, storage, namespace, onLocaleChange]);

    // Translation function
    const t = useCallback<TranslateFunction>((key, params) => {
        const keys = key.split('.');
        let value: any = translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Return key if not found
                return key;
            }
        }

        if (typeof value !== 'string') {
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

    const contextValue: LokalContextValue = {
        locale,
        setLocale,
        locales,
        t,
        translations,
        isLoading,
    };

    return (
        <LokalContext.Provider value={contextValue}>
            {children}
        </LokalContext.Provider>
    );
}

/**
 * Hook to access the Lokal context
 */
export function useLokal(): LokalContextValue {
    const context = useContext(LokalContext);

    if (!context) {
        throw new Error('useLokal must be used within a LokalProvider');
    }

    return context;
}

export default LokalContext;
