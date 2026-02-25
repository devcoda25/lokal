import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
    ConfigLoader,
    FileStorage,
    AITranslator,
    TranslationProviderFactory,
    type LocaleData
} from 'lokal-core';

interface TranslateOptions {
    config?: string;
    locale?: string;
    all?: boolean;
    verbose?: boolean;
}

/**
 * Translate missing strings using AI
 */
export async function translateCommand(options: TranslateOptions): Promise<void> {
    const spinner = ora('Loading configuration...').start();

    try {
        // Load config
        const configLoader = new ConfigLoader();
        let config;

        if (options.config) {
            config = configLoader.loadSync(options.config);
        } else {
            config = await configLoader.load();
        }

        // Check if AI is configured
        if (!config.ai) {
            spinner.fail(chalk.red('AI provider not configured. Add ai configuration to lokal.config.js'));
            console.log(chalk.gray('\nExample configuration:'));
            console.log(chalk.gray('  ai: {'));
            console.log(chalk.gray('    provider: "openai",'));
            console.log(chalk.gray('    apiKey: process.env.OPENAI_API_KEY'));
            console.log(chalk.gray('  }'));
            process.exit(1);
        }

        const apiKey = config.ai.apiKey || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            spinner.fail(chalk.red('No API key found. Set ai.apiKey in config or environment variable.'));
            process.exit(1);
        }

        spinner.text = 'Initializing AI translator...';

        // Create provider
        const provider = TranslationProviderFactory.create(
            config.ai.provider,
            apiKey,
            config.ai.model
        );

        // Create translator
        const translator = new AITranslator(provider);

        const projectRoot = process.cwd();
        const outputDir = path.resolve(projectRoot, config.outputDir);
        const storage = new FileStorage(outputDir);

        spinner.succeed('AI translator ready');

        // Determine which locales to translate
        let targetLocales: string[] = [];
        const availableLocales = config.locales || [];

        if (options.all) {
            targetLocales = availableLocales.filter(l => l !== config.defaultLocale);
        } else if (options.locale) {
            targetLocales = [options.locale];
        } else {
            // Default: translate to first non-default locale
            targetLocales = availableLocales.filter(l => l !== config.defaultLocale).slice(0, 1);
        }

        if (targetLocales.length === 0) {
            spinner.warn(chalk.yellow('No target locales to translate. Add more locales to your config.'));
            return;
        }

        // Load source locale data
        const sourceLocale = config.defaultLocale;
        const sourceData = storage.loadLocale(sourceLocale);

        if (!sourceData) {
            spinner.fail(chalk.red(`Source locale ${sourceLocale} not found. Run 'lokal scan' first.`));
            process.exit(1);
        }

        // Translate to each target locale
        for (const targetLocale of targetLocales) {
            const translateSpinner = ora(`Translating to ${chalk.cyan(targetLocale)}...`).start();

            // Load existing target data (if any)
            const targetLocaleFile = storage.loadLocale(targetLocale);
            const targetData: LocaleData = targetLocaleFile ? targetLocaleFile.data : {};

            // Translate missing keys
            const translatedData = await translator.translateMissingKeys(
                sourceData.data,
                targetData,
                sourceLocale,
                targetLocale
            );

            // Save translated data
            storage.saveLocale(targetLocale, translatedData);

            translateSpinner.succeed(chalk.green(`Translated to ${chalk.bold(targetLocale)}`));

            if (options.verbose) {
                // Show sample translations
                const keys = Object.keys(translatedData).slice(0, 5);
                for (const key of keys) {
                    const value = translatedData[key];
                    if (typeof value === 'string') {
                        console.log(chalk.gray(`  ${key}: ${value}`));
                    }
                }
            }
        }

        console.log(chalk.bold('\n✓ Translation complete!'));
        console.log(chalk.gray(`\nRun `) + chalk.cyan('npx lokal scan') + chalk.gray(' to see updated translations'));

    } catch (error) {
        spinner.fail(chalk.red(`Translation failed: ${error}`));
        if (options.verbose) {
            console.error(error);
        }
        process.exit(1);
    }
}

export function registerTranslateCommand(program: Command): void {
    program
        .command('translate')
        .description('Translate missing strings using AI')
        .option('-c, --config <path>', 'Path to config file')
        .option('-l, --locale <locale>', 'Specific locale to translate')
        .option('-a, --all', 'Translate all locales', false)
        .option('-v, --verbose', 'Verbose output', false)
        .action(translateCommand);
}
