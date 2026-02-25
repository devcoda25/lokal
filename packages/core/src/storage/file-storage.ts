import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface LocaleData {
    [key: string]: string | LocaleData;
}

export interface LocaleFile {
    locale: string;
    data: LocaleData;
    hash: string;
    lastUpdated: string;
}

/**
 * Content hash for incremental sync
 */
export class ContentHasher {
    /**
     * Generate a hash for content to detect changes
     */
    static hash(content: string): string {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Generate a hash for a locale data object
     */
    static hashLocaleData(data: LocaleData): string {
        const content = JSON.stringify(data, Object.keys(data).sort());
        return this.hash(content);
    }
}

/**
 * File system persistence for locale files
 */
export class FileStorage {
    private basePath: string;

    constructor(basePath: string) {
        this.basePath = path.resolve(basePath);
        this.ensureDirectoryExists(this.basePath);
    }

    /**
     * Ensure directory exists
     */
    private ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Load locale data from file
     */
    loadLocale(locale: string): LocaleFile | null {
        const filePath = this.getLocalePath(locale);

        if (!fs.existsSync(filePath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as LocaleFile;
        } catch (error) {
            console.warn(`Failed to load locale ${locale}: ${error}`);
            return null;
        }
    }

    /**
     * Save locale data to file
     */
    saveLocale(locale: string, data: LocaleData): void {
        const filePath = this.getLocalePath(locale);
        const hash = ContentHasher.hashLocaleData(data);

        const localeFile: LocaleFile = {
            locale,
            data,
            hash,
            lastUpdated: new Date().toISOString(),
        };

        const content = JSON.stringify(localeFile, null, 2);
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * Get all locale files
     */
    loadAllLocales(): Map<string, LocaleFile> {
        const locales = new Map<string, LocaleFile>();

        if (!fs.existsSync(this.basePath)) {
            return locales;
        }

        const files = fs.readdirSync(this.basePath);

        for (const file of files) {
            if (file.endsWith('.json')) {
                const locale = file.replace('.json', '');
                const localeFile = this.loadLocale(locale);
                if (localeFile) {
                    locales.set(locale, localeFile);
                }
            }
        }

        return locales;
    }

    /**
     * Get the file path for a locale
     */
    private getLocalePath(locale: string): string {
        if (locale.includes('..')) {
            throw new Error(`Security Error: Invalid locale path contains traversal: ${locale}`);
        }

        const targetPath = path.resolve(this.basePath, `${locale}.json`);

        if (!targetPath.startsWith(this.basePath)) {
            throw new Error(`Security Error: Invalid locale path access outside of storage directory: ${locale}`);
        }

        return targetPath;
    }

    /**
     * Check if a locale file exists
     */
    localeExists(locale: string): boolean {
        return fs.existsSync(this.getLocalePath(locale));
    }

    /**
     * Delete a locale file
     */
    deleteLocale(locale: string): boolean {
        const filePath = this.getLocalePath(locale);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }

        return false;
    }

    /**
     * Get all available locales
     */
    getAvailableLocales(): string[] {
        if (!fs.existsSync(this.basePath)) {
            return [];
        }

        return fs.readdirSync(this.basePath)
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));
    }

    /**
     * Merge new data with existing locale data
     */
    mergeLocaleData(locale: string, newData: LocaleData, preserveExisting: boolean = true): LocaleData {
        const existing = this.loadLocale(locale);

        if (!existing) {
            return newData;
        }

        if (preserveExisting) {
            return this.deepMerge(existing.data, newData);
        }

        return newData;
    }

    /**
     * Deep merge two objects
     */
    private deepMerge(target: any, source: any): any {
        if (typeof target !== 'object' || typeof source !== 'object') {
            return source;
        }

        const result = { ...target };

        for (const key in source) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue;
            }

            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }
}

export default FileStorage;
