import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ASTParser, ConfigLoader, FileStorage, type ExtractedString } from '@devcoda/lokal-core';

interface ScanOptions {
    config?: string;
    output?: string;
    verbose?: boolean;
}

/**
 * Scan source files for translation strings and update locale files
 */
export async function scanCommand(options: ScanOptions): Promise<void> {
    const spinner = ora('Scanning for translation strings...').start();

    try {
        // Load config
        const configLoader = new ConfigLoader();
        let config;

        if (options.config) {
            config = configLoader.loadSync(options.config);
        } else {
            config = await configLoader.load();
        }

        const projectRoot = process.cwd();
        const sourceDir = path.resolve(projectRoot, config.sourceDir);
        const outputDir = options.output
            ? path.resolve(projectRoot, options.output)
            : path.resolve(projectRoot, config.outputDir);

        spinner.text = `Scanning ${chalk.cyan(sourceDir)}...`;

        // Create parser
        const parser = new ASTParser({
            filePath: sourceDir,
            functionName: config.functionName,
            componentName: config.componentName,
        });

        // Scan directory
        const result = parser.scanDirectory(sourceDir);

        if (result.errors.length > 0 && options.verbose) {
            for (const error of result.errors) {
                spinner.warn(chalk.yellow(error));
            }
        }

        spinner.succeed(chalk.green(`Found ${chalk.bold(result.strings.length)} translation strings`));

        if (result.strings.length === 0) {
            spinner.info(chalk.gray('No strings found. Make sure to use t("key") or <T>key</T> in your code.'));
            return;
        }

        // Create storage
        const storage = new FileStorage(outputDir);

        // Create unique key-value map
        const uniqueStrings = new Map<string, ExtractedString>();
        for (const str of result.strings) {
            uniqueStrings.set(str.key, str);
        }

        // Get the default locale
        const defaultLocale = config.defaultLocale;
        const existingLocale = storage.loadLocale(defaultLocale);

        // Merge with existing keys
        let existingData: Record<string, any> = {};
        if (existingLocale) {
            existingData = existingLocale.data as Record<string, any>;
        }

        // Convert extracted strings to flat key-value object
        const newData: Record<string, string> = {};
        for (const [key, value] of uniqueStrings) {
            // Use the key itself as the translation value for now
            newData[key] = existingData[key] || value.value;
        }

        // Save the merged data
        const mergedData = storage.mergeLocaleData(defaultLocale, newData);
        storage.saveLocale(defaultLocale, mergedData);

        spinner.succeed(chalk.green(`Updated ${chalk.bold(`locales/${defaultLocale}.json`)}`));

        // Show sample of extracted strings
        if (options.verbose) {
            console.log(chalk.bold('\nExtracted strings:'));
            const sampleKeys = Array.from(uniqueStrings.keys()).slice(0, 10);
            for (const key of sampleKeys) {
                console.log(chalk.gray(`  • ${key}`));
            }
            if (uniqueStrings.size > 10) {
                console.log(chalk.gray(`  ... and ${uniqueStrings.size - 10} more`));
            }
        }

        // Check for other locales that need translation
        const locales = storage.getAvailableLocales();
        const otherLocales = locales.filter(l => l !== defaultLocale);

        if (otherLocales.length > 0) {
            console.log(chalk.gray(`\nOther locales detected: ${otherLocales.join(', ')}`));
            console.log(chalk.gray('Run ') + chalk.cyan('npx lokal translate') + chalk.gray(' to translate missing strings'));
        }

    } catch (error) {
        spinner.fail(chalk.red(`Scan failed: ${error}`));
        if (options.verbose) {
            console.error(error);
        }
        process.exit(1);
    }
}

export function registerScanCommand(program: Command): void {
    program
        .command('scan')
        .description('Scan source files for translation strings')
        .option('-c, --config <path>', 'Path to config file')
        .option('-o, --output <path>', 'Output directory for locale files')
        .option('-v, --verbose', 'Verbose output', false)
        .action(scanCommand);
}
