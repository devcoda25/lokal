import FileStorage from './file-storage';
import * as fs from 'fs';
import * as path from 'path';

describe('FileStorage', () => {
    const testDir = path.join(__dirname, 'test-storage');
    let storage: FileStorage;

    beforeEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
        storage = new FileStorage(testDir);
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should save and load locale', () => {
        const locale = 'en';
        const data = { hello: 'world' };
        storage.saveLocale(locale, data);

        const loaded = storage.loadLocale(locale);
        expect(loaded).not.toBeNull();
        expect(loaded?.data).toEqual(data);
    });

    it('should prevent path traversal with ..', () => {
        expect(() => {
            storage.saveLocale('../outside', { test: 'fail' });
        }).toThrow(/Security Error/);
    });

    it('should prevent path traversal with absolute path', () => {
        const absPath = path.resolve(testDir, '../outside');
        // On Unix, absPath starts with /
        // locale is usually just locale code, but if someone passes absolute path
        // path.resolve(base, absPath) -> absPath

        // However, we append .json
        // So if I pass /tmp/bad
        // path.resolve(base, '/tmp/bad.json') -> /tmp/bad.json

        // We simulate absolute path by passing one (without extension as .json is appended)
        const absLocale = path.resolve(testDir, '../secret');

        expect(() => {
            storage.saveLocale(absLocale, { test: 'fail' });
        }).toThrow(/Security Error/);
    });

    it('should prevent prototype pollution', () => {
        const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}}');
        const target = {};

        // Access private method for testing
        const result = (storage as any).deepMerge(target, maliciousPayload);

        expect(result.polluted).toBeUndefined();
        expect((result as any).__proto__.polluted).toBeUndefined();
        expect({}.constructor.prototype.polluted).toBeUndefined();
        expect(({} as any).polluted).toBeUndefined();
    });
});
