<p align="center">
  <img src="assets/language.png" alt="LOKAL Logo" width="200" />
</p>

<h1 align="center">LOKAL</h1>

<p align="center">
  <a href="https://github.com/devcoda25/lokal/actions/workflows/ci.yml">
    <img src="https://github.com/devcoda25/lokal/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://www.npmjs.com/package/lokal-core">
    <img src="https://img.shields.io/npm/v/lokal-core.svg" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/lokal-cli">
    <img src="https://img.shields.io/npm/v/lokal-cli.svg" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/lokal-react">
    <img src="https://img.shields.io/npm/v/lokal-react.svg" alt="npm version" />
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  </a>
</p>

<p align="center">
  <strong>AI-Powered Localization for React & React Native</strong>
</p>

---

## Features

- 🤖 **AI Translation** - Powered by Google Gemini, OpenAI, or DeepSeek
- 🔍 **Smart Extraction** - AST-based string extraction from your code
- ⚡ **Incremental Sync** - Only translates changed content using content hashing
- 💾 **File Storage** - JSON-based locale file management
- 📦 **Monorepo** - Three packages: Core, CLI, and React adapter

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| `lokal-core` | Core library with AST parser, AI translators, and storage | [View](https://www.npmjs.com/package/lokal-core) |
| `lokal-cli` | Command-line tool for automation | [View](https://www.npmjs.com/package/lokal-cli) |
| `lokal-react` | React hooks and context provider | [View](https://www.npmjs.com/package/lokal-react) |

## Quick Start

### Installation

```bash
# Install CLI globally
npm install -g lokal-cli

# Or use with npx
npx lokal --help
```

### Initialize Your Project

```bash
# Initialize LOKAL in your project
npx lokal init --locales en,es,fr --default-locale en
```

This creates:
- `lokal.config.js` - Configuration file
- `locales/` - Directory for locale files
- `locales/en.json` - Default locale file

### Add Translation Strings

Use `t()` function or `<T>` component in your code:

```tsx
// Using function
function Welcome() {
  return <h1>{t('Welcome to our app')}</h1>;
}

// Using component
function Button() {
  return <button><T>Click here</T></button>;
}
```

### Scan and Translate

```bash
# Scan for strings and update locale files
npx lokal scan

# Translate to other languages using AI
npx lokal translate --all
```

## Configuration

Edit `lokal.config.js`:

```javascript
module.exports = {
  // Supported locales
  locales: ['en', 'es', 'fr', 'de', 'ja'],
  
  // Default locale
  defaultLocale: 'en',
  
  // Function name (default: 't')
  functionName: 't',
  
  // Component name (default: 'T')
  componentName: 'T',
  
  // Source directory
  sourceDir: './src',
  
  // Output directory
  outputDir: './locales',
  
  // AI Translation
  ai: {
    provider: 'gemini',  // 'openai', 'gemini', or 'deepseek'
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash'
  }
};
```

## Supported Translation Patterns

| Pattern | Code Example | Extracts |
|---------|--------------|----------|
| Function call | `t("Hello World")` | ✅ "Hello World" |
| JSX Component | `<T>Welcome</T>` | ✅ "Welcome" |

## Supported AI Providers

### Google Gemini (Recommended)

```javascript
ai: {
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.5-flash'
}
```

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### OpenAI

```javascript
ai: {
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini'
}
```

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

### DeepSeek

```javascript
ai: {
  provider: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat'
}
```

Get your API key from [DeepSeek Platform](https://platform.deepseek.com/)

## CLI Commands

| Command | Description |
|---------|-------------|
| `lokal init` | Initialize LOKAL in your project |
| `lokal scan` | Scan source files for translation strings |
| `lokal translate` | Translate missing strings with AI |

### Options

```bash
# Init
npx lokal init --locales en,es,fr --default-locale en

# Scan
npx lokal scan --verbose

# Translate
npx lokal translate --locale es    # Translate to specific locale
npx lokal translate --all          # Translate all locales
```

## Library Usage

You can also use LOKAL programmatically:

```typescript
import { ASTParser, GeminiProvider, AITranslator, FileStorage } from 'lokal-core';

// 1. Extract strings
const parser = new ASTParser({ filePath: './src' });
const result = parser.scanDirectory('./src/components');

// 2. Translate
const provider = new GeminiProvider('YOUR-API-KEY');
const translator = new AITranslator(provider);
const translated = await translator.translateMissingKeys(sourceData, {}, 'en', 'es');

// 3. Save
const storage = new FileStorage('./locales');
storage.saveLocale('es', translated);
```

## React Integration

Use the React adapter for easy access to translations:

```tsx
import { LokalProvider, useTranslation } from 'lokal-react';
import en from '../locales/en.json';
import es from '../locales/es.json';

function App() {
  return (
    <LokalProvider
      locale="es"
      translations={{ en, es }}
    >
      <MyApp />
    </LokalProvider>
  );
}

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('welcome')}</h1>;
}
```

## Architecture

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
│  └──────────────┬──────────────┘            │
│                 ▼                           │
│  ┌─────────────────────────────┐            │
│  │     File Storage            │            │
│  └─────────────────────────────┘            │
│                                             │
└─────────────────────────────────────────────┘
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/devcoda25">devcoda25</a>
</p>
