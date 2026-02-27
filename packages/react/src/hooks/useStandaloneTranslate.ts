import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LocaleData } from 'lokal-core';
import type { ExtendedTranslateFunction, StorageInterface } from '../context/LokalContext';

// Re-implement the translation logic for standalone use
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

function getPluralCategory(locale: string, count: number): string {
    const rules: Record<string, (n: number) => string> = {
        en: (n) => n === 1 ? 'one' : 'other',
        fr: (n) => n === 0 || n === 1 ? 'one' : 'many',
        es: (n) => n === 1 ? 'one' : 'many',
        de: (n) => n === 1 ? 'one' : 'other',
    };

    const rule = rules[locale] || rules['en'];
    return rule(count);
}

/**
 * Create a standalone translation function
 * Useful for non-React contexts or when you want to avoid hooks
 */
export function createTranslate(
    translations: LocaleData,
    locale: string = 'en'
): ExtendedTranslateFunction {
    const translate = (key: string, params?: Record<string, string | number>): string => {
        const value = getNestedValue(translations, key);

        if (!value) return key;

        if (params) {
            return Object.entries(params).reduce(
                (str, [paramKey, paramValue]) =>
                    str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
                value
            );
        }

        return value;
    };

    const translatePlural = (key: string, params: any): string => {
        const { count, ...restParams } = params;
        const pluralCategory = getPluralCategory(locale, count);

        let value = getNestedValue(translations, `${key}_${pluralCategory}`);
        if (!value) value = getNestedValue(translations, key);

        if (!value) return key;

        const allParams = { count, ...restParams };
        return Object.entries(allParams).reduce(
            (str, [paramKey, paramValue]) =>
                str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
            value
        );
    };

    const translateGender = (key: string, params: any): string => {
        const { gender, ...restParams } = params;

        let value = getNestedValue(translations, `${key}_${gender}`);
        if (!value) value = getNestedValue(translations, key);

        if (!value) return key;

        const allParams = { gender, ...restParams };
        return Object.entries(allParams).reduce(
            (str, [paramKey, paramValue]) =>
                str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
            value
        );
    };

    const translateChoice = (key: string, params: { value: string | number }): string => {
        const { value } = params;

        let translation = getNestedValue(translations, `${key}_${value}`);
        if (!translation) translation = getNestedValue(translations, key);

        return translation || key;
    };

    const extendedFn = translate as ExtendedTranslateFunction;
    extendedFn.plural = translatePlural;
    extendedFn.gender = translateGender;
    extendedFn.choice = translateChoice;

    return extendedFn;
}

/**
 * Hook to create a standalone translate function from context
 * This is useful when you want to pass translation function to non-React code
 */
export function useStandaloneTranslate(): ExtendedTranslateFunction {
    const { t, translations, locale } = require('../context/LokalContext').useLokal();

    return useMemo(() => createTranslate(translations, locale), [translations, locale]);
}

export default createTranslate;
