# LOKAL - AI-Powered Localization for React

[![CI](https://github.com/devcoda25/lokal/actions/workflows/ci.yml/badge.svg)](https://github.com/devcoda25/lokal/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/lokal-core.svg)](https://www.npmjs.com/package/lokal-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

LOKAL is an AI-powered localization ecosystem that helps you extract, translate, and manage translation strings in your React applications.

## Features

- **CLI Commands** - Easy command-line workflow
- **AST-based Extraction** - Automatically finds translation strings in your code
- **AI Translation** - Powered by Google Gemini, OpenAI, or DeepSeek
- **Incremental Sync** - Only translates changed content using content hashing
- **File Storage** - JSON-based locale file management
- **Framework Ready** - Works with React and React Native

## Installation

```bash
# Install CLI globally
npm install -g lokal

# Or use with npx
npx lokal --help
```

## CLI Commands

LOKAL provides three main CLI commands:

### 1. `lokal init`

Initialize LOKAL in your project:

```bash
npx lokal init
```

**Options:**
- `-l, --locales <locales>` - Comma-separated locales (default: "en")
- `-d, --default-locale <locale>` - Default locale (default: "en")
- `-f, --force` - Force reinitialization

**What it does:**
- Creates `lokal.config.js`
- Creates `locales/` directory
- Creates default locale file (e.g., `locales/en.json`)

### 2. `lokal scan`

Scan source files for translation strings:

```bash
npx lokal scan
```

**Options:**
- `-c, --config <path>` - Path to config file
- `-o, --output <path>` - Output directory
- `-v, --verbose` - Show detailed output

**What it does:**
- Scans `./src` for `t()` and `<T>` patterns
- Extracts all translation strings
- Updates the default locale file

### 3. `lokal translate`

Translate missing strings using AI:

```bash
# Translate to first non-default locale
npx lokal translate

# Translate to specific locale
npx lokal translate --locale es

# Translate all locales
npx lokal translate --all
```

**Options:**
- `-c, --config <path>` - Path to config file
- `-l, --locale <locale>` - Specific locale to translate
- `-a, --all` - Translate all locales
- `-v, --verbose` - Show detailed output

## Configuration

After running `lokal init`, a `lokal.config.js` file is created:

```javascript
module.exports = {
  // Supported locales
  locales: ['en', 'es', 'fr'],
  
  // Default locale
  defaultLocale: 'en',
  
  // Function name for translations (t("key"))
  functionName: 't',
  
  // Component name for translations (<T>key</T>)
  componentName: 'T',
  
  // Source directory to scan
  sourceDir: './src',
  
  // Output directory for locale files
  outputDir: './locales',
  
  // AI Translation settings
  ai: {
    provider: 'gemini',  // 'openai', 'gemini', or 'deepseek'
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash'
  }
};
```

## Complete Workflow

```bash
# Step 1: Initialize your project
npx lokal init --locales en,es,fr --default-locale en

# Step 2: Add translation strings to your code
# t("Hello") or <T>Hello</T>

# Step 3: Scan for strings (run after adding new strings)
npx lokal scan

# Step 4: Translate with AI
npx lokal translate --all
```

---

## Library Usage (Advanced)

You can also use LOKAL as a library in your code:

```typescript
import { ASTParser, GeminiProvider, AITranslator, FileStorage } from 'lokal-core';
```

---

## Architecture

LOKAL consists of three main components:

```
┌─────────────────────────────────────────────┐
│              LOKAL Core                      │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ AST Parser  │  │ AI Translate│           │
│  └──────┬──────┘  └──────┬──────┘           │
│         │                │                   │
│         ▼                ▼                   │
│  ┌─────────────────────────────┐            │
│  │    Translation Workflow     │            │
│  │  1. Extract strings        │            │
│  │  2. Translate with AI      │            │
│  │  3. Save to files          │            │
│  └──────────────┬──────────────┘            │
│                 ▼                           │
│  ┌─────────────────────────────┐            │
│  │     File Storage            │            │
│  └─────────────────────────────┘            │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 1. AST Parser

The AST Parser scans your source code and extracts translation strings using Abstract Syntax Tree parsing.

### Supported Patterns

| Pattern | Code Example | Extracts |
|---------|--------------|----------|
| Function call | `t("Hello World")` | `"Hello World"` |
| Function with variable | `t(greeting)` | ❌ (not extracted) |
| JSX Component | `<T>Welcome</T>` | `"Welcome"` |
| JSX with expression | `<T>{name}</T>` | ❌ (not extracted) |

### Basic Usage

```typescript
import { ASTParser } from 'lokal-core';

// Create parser with default settings
const parser = new ASTParser({
    filePath: './src'  // Path to scan
});

// Parse a single file
const result = parser.parseFile('./src/components/Button.tsx');

console.log(result.strings);
// [
//   { key: "Submit", value: "Submit", file: "...", line: 10, column: 5 },
//   { key: "Cancel", value: "Cancel", file: "...", line: 11, column: 5 }
// ]
```

### Custom Function and Component Names

By default, LOKAL looks for `t()` function and `<T>` component. You can customize this:

```typescript
const parser = new ASTParser({
    filePath: './src',
    functionName: 'translate',  // Looks for translate("string")
    componentName: 'Trans'      // Looks for <Trans>string</Trans>
});
```

### Scan Directory

```typescript
// Scan entire directory
const result = parser.scanDirectory('./src', ['.ts', '.tsx', '.js', '.jsx']);

// result.strings - Array of extracted strings
// result.errors  - Any parsing errors
```

### Type Definitions

```typescript
interface ExtractedString {
    key: string;      // Translation key (same as value for simple strings)
    value: string;    // The actual string content
    file: string;     // File path where found
    line: number;     // Line number
    column: number;   // Column number
}

interface ScanResult {
    strings: ExtractedString[];
    errors: string[];
}
```

---

## 2. AI Translation

LOKAL supports multiple AI providers for translating your strings.

### Supported Providers

| Provider | Model | API Key |
|----------|-------|---------|
| Google Gemini | gemini-2.5-flash | Google AI Studio |
| OpenAI | gpt-4o-mini | OpenAI Platform |
| DeepSeek | deepseek-chat | DeepSeek Platform |

### Google Gemini (Recommended)

```typescript
import { GeminiProvider, AITranslator } from 'lokal-core';

// Create Gemini provider
const gemini = new GeminiProvider(
    'YOUR-GEMINI-API-KEY',  // Get from https://aistudio.google.com/app/apikey
    'gemini-2.5-flash'       // Model name (optional)
);

// Create translator
const translator = new AITranslator(gemini);
```

### OpenAI

```typescript
import { OpenAIProvider, AITranslator } from 'lokal-core';

const openai = new OpenAIProvider(
    'YOUR-OPENAI-API-KEY',  // Get from https://platform.openai.com/api-keys
    'gpt-4o-mini'           // Model (optional)
);

const translator = new AITranslator(openai);
```

### DeepSeek

```typescript
import { DeepSeekProvider, AITranslator } from 'lokal-core';

const deepseek = new DeepSeekProvider(
    'YOUR-DEEPSEEK-API-KEY',
    'deepseek-chat'
);

const translator = new AITranslator(deepseek);
```

### Translate Strings

```typescript
// Single translation
const result = await translator.translate({
    sourceText: 'Hello World',
    sourceLocale: 'en',
    targetLocale: 'es'
});

console.log(result.translatedText); // "Hola Mundo"

// Batch translation
const results = await translator.translateBatch([
    { sourceText: 'Hello', sourceLocale: 'en', targetLocale: 'es' },
    { sourceText: 'Goodbye', sourceLocale: 'en', targetLocale: 'es' }
]);
```

### Incremental Sync

LOKAL uses content hashing to skip translating unchanged strings:

```typescript
// First translation
const sourceData = { greeting: 'Hello', welcome: 'Welcome' };
const targetData = {};

const translated1 = await translator.translateMissingKeys(
    sourceData,
    targetData,
    'en',
    'es'
);
// translated1 = { greeting: 'Hola', welcome: 'Bienvenido' }

// Second call with SAME source - skips already translated
const translated2 = await translator.translateMissingKeys(
    sourceData,    // Same as before
    translated1,  // Previous result
    'en',
    'es'
);
// Returns translated1 immediately (skips API calls)

// Third call with CHANGED source - only translates changed
sourceData.greeting = 'Hi';  // Changed!
const translated3 = await translator.translateMissingKeys(
    sourceData,
    translated2,
    'en',
    'es'
);
// Only 'greeting' is re-translated
```

---

## 3. File Storage

LOKAL provides file-based storage for your locale files.

### Basic Usage

```typescript
import { FileStorage } from 'lokal-core';

const storage = new FileStorage('./locales');
```

### Save Locale

```typescript
const localeData = {
    common: {
        greeting: 'Hello',
        goodbye: 'Goodbye'
    },
    home: {
        title: 'Welcome',
        subtitle: 'Welcome to our app'
    }
};

storage.saveLocale('en', localeData);
// Creates: locales/en.json
```

### Load Locale

```typescript
const enData = storage.loadLocale('en');
// Returns: { locale: 'en', data: {...}, hash: '...', lastUpdated: '...' }

// Get just the data
const data = enData?.data;
```

### Merge Data

```typescript
// Merge new keys into existing locale
const merged = storage.mergeLocaleData('en', newKeys, preserveExisting = true);

// Example:
const existing = { common: { greeting: 'Hello' } };
const newKeys = { common: { greeting: 'Hi', newKey: 'New' } };
const result = storage.mergeLocaleData('en', newKeys, true);
// result = { common: { greeting: 'Hello', newKey: 'New' } }
```

### Other Operations

```typescript
// Check if locale exists
storage.localeExists('en'); // true/false

// Get all available locales
storage.getAvailableLocales(); // ['en', 'es', 'fr']

// Delete locale
storage.deleteLocale('fr');
```

---

## Complete Example: Translate a React App

### Step 1: Create the translation script

```typescript
// translate.ts
import { ASTParser, GeminiProvider, AITranslator, FileStorage } from 'lokal-core';

async function translateApp() {
    const SOURCE_DIR = './src';
    const TARGET_LOCALES = ['es', 'fr', 'de', 'ja'];
    const SOURCE_LOCALE = 'en';

    // 1. Extract strings from source
    console.log('🔍 Scanning for translation strings...');
    const parser = new ASTParser({ filePath: SOURCE_DIR });
    const scanResult = parser.scanDirectory(SOURCE_DIR);

    if (scanResult.errors.length > 0) {
        console.warn('⚠️  Some files had errors:', scanResult.errors);
    }

    // 2. Build source locale data
    const sourceData: Record<string, any> = {};
    for (const str of scanResult.strings) {
        sourceData[str.key] = str.value;
    }

    // 3. Save source locale
    console.log('💾 Saving source locale...');
    const storage = new FileStorage('./locales');
    storage.saveLocale(SOURCE_LOCALE, sourceData);

    // 4. Translate to each target locale
    console.log('🤖 Starting AI translation...');
    const provider = new GeminiProvider('YOUR-API-KEY');
    const translator = new AITranslator(provider);

    for (const targetLocale of TARGET_LOCALES) {
        console.log(`   Translating to ${targetLocale}...`);
        
        const targetData = storage.loadLocale(targetLocale)?.data || {};
        const translated = await translator.translateMissingKeys(
            sourceData,
            targetData,
            SOURCE_LOCALE,
            targetLocale
        );

        storage.saveLocale(targetLocale, translated);
        console.log(`   ✓ ${targetLocale} complete`);
    }

    console.log('✅ Translation complete!');
}

translateApp().catch(console.error);
```

### Step 2: Run the script

```bash
npx tsx translate.ts
```

### Step 3: Use in your React app

```tsx
// locales/en.json
{
    "greeting": "Hello",
    "welcome": "Welcome to our app"
}

// locales/es.json
{
    "greeting": "Hola",
    "welcome": "Bienvenido a nuestra aplicación"
}

// App.jsx
import en from './locales/en.json';
import es from './locales/es.json';

const locales = { en, es };
const [locale, setLocale] = useState('en');

function t(key) {
    return locales[locale]?.[key] || key;
}

function App() {
    return (
        <div>
            <h1>{t('greeting')}</h1>
            <p>{t('welcome')}</p>
        </div>
    );
}
```

---

## API Reference

### ASTParser

```typescript
new ASTParser(options: ScanOptions)
```

**ScanOptions:**
- `filePath: string` - Path to file or directory
- `functionName?: string` - Translation function name (default: 't')
- `componentName?: string` - Translation component name (default: 'T')

**Methods:**
- `parseFile(filePath: string): ScanResult` - Parse single file
- `parseContent(content: string, filePath?: string): ScanResult` - Parse content string
- `scanDirectory(dirPath: string, extensions?: string[]): ScanResult` - Scan directory

### TranslationProvider

```typescript
interface TranslationProvider {
    translate(request: TranslationRequest): Promise<TranslationResult>;
    translateBatch(requests: TranslationRequest[]): Promise<TranslationResult[]>;
}
```

**TranslationRequest:**
```typescript
{
    sourceText: string;
    sourceLocale: string;
    targetLocale: string;
    context?: string;
}
```

**TranslationResult:**
```typescript
{
    translatedText: string;
    sourceText: string;
    success: boolean;
    error?: string;
}
```

### AITranslator

```typescript
new AITranslator(provider: TranslationProvider)
```

**Methods:**
- `translateMissingKeys(sourceData, targetData, sourceLocale, targetLocale): Promise<LocaleData>`

### FileStorage

```typescript
new FileStorage(basePath: string)
```

**Methods:**
- `loadLocale(locale: string): LocaleFile | null`
- `saveLocale(locale: string, data: LocaleData): void`
- `loadAllLocales(): Map<string, LocaleFile>`
- `localeExists(locale: string): boolean`
- `deleteLocale(locale: string): boolean`
- `getAvailableLocales(): string[]`
- `mergeLocaleData(locale: string, newData: LocaleData, preserveExisting?: boolean): LocaleData`

---

## Error Handling

All AI providers return proper error information:

```typescript
const result = await translator.translate({
    sourceText: 'Hello',
    sourceLocale: 'en',
    targetLocale: 'es'
});

if (!result.success) {
    console.error('Translation failed:', result.error);
    // Handle errors appropriately
}
```

Common errors:
- `429` - Rate limit exceeded
- `insufficient_quota` - No API credits left
- `invalid_api_key` - Invalid API key
- `model_not_found` - Model doesn't exist

---

## License

MIT
