import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ASTWrapper, ConfigLoader, FileStorage, type WrappedString } from 'lokal-core';

interface WrapOptions {
    config?: string;
    src?: string;
    function?: string;
    dryRun?: boolean;
    verbose?: boolean;
}

/**
 * Auto-wrap translatable strings in source files
 * Converts plain text to t("key") calls
 */
export async function wrapCommand(options: WrapOptions): Promise<void> {
    const spinner = ora('Preparing to wrap strings...').start();

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
        
        // Determine source directory
        const sourceDir = options.src
            ? path.resolve(projectRoot, options.src)
            : path.resolve(projectRoot, config.sourceDir);

        // Check if source directory exists
        if (!fs.existsSync(sourceDir)) {
            spinner.fail(chalk.red(`Source directory not found: ${sourceDir}`));
            process.exit(1);
        }

        // Create wrapper
        const wrapper = new ASTWrapper({
            functionName: options.function || config.functionName || 't',
            componentName: config.componentName || 'T',
        });

        spinner.text = `Scanning ${chalk.cyan(sourceDir)} for translatable strings...`;

        // First pass: collect all wrapped strings without modifying
        const results = wrapper.wrapDirectory(sourceDir, ['.js', '.jsx', '.ts', '.tsx'], true);
        
        // Count total strings to wrap
        let totalStrings = 0;
        const fileResults: { file: string, wrapped: WrappedString[] }[] = [];
        
        for (const result of results.results) {
            if (result.wrapped.length > 0) {
                fileResults.push({
                    file: result.file,
                    wrapped: result.wrapped
                });
                totalStrings += result.wrapped.length;
            }
        }

        // Show skipped files (already wrapped)
        if (results.skipped && results.skipped.length > 0) {
            console.log(chalk.bold('\n⚠ Skipped (already wrapped):'));
            for (const file of results.skipped.slice(0, 5)) {
                console.log(chalk.gray(`  ${path.relative(projectRoot, file)}`));
            }
            if (results.skipped.length > 5) {
                console.log(chalk.gray(`  ... and ${results.skipped.length - 5} more`));
            }
        }

        // Show errors
        if (results.errors && results.errors.length > 0) {
            console.log(chalk.bold('\n⚠ Errors:'));
            for (const error of results.errors.slice(0, 5)) {
                console.log(chalk.red(`  ${error}`));
            }
            if (results.errors.length > 5) {
                console.log(chalk.red(`  ... and ${results.errors.length - 5} more`));
            }
        }

        spinner.succeed(chalk.green(`Found ${chalk.bold(totalStrings)} strings to wrap in ${chalk.bold(fileResults.length)} files`));

        if (totalStrings === 0) {
            spinner.info(chalk.gray('No strings found that need wrapping.'));
            return;
        }

        // Show preview
        if (!options.dryRun) {
            console.log(chalk.bold('\nPreview (first 10 files):'));
            let count = 0;
            for (const fileResult of fileResults.slice(0, 10)) {
                console.log(chalk.cyan(`\n${path.relative(projectRoot, fileResult.file)}:`));
                for (const wrapped of fileResult.wrapped.slice(0, 5)) {
                    console.log(chalk.gray(`  "${wrapped.original}" → ${wrapped.wrapped}`));
                    count++;
                }
                if (fileResult.wrapped.length > 5) {
                    console.log(chalk.gray(`  ... and ${fileResult.wrapped.length - 5} more`));
                }
            }
            if (fileResults.length > 10) {
                console.log(chalk.gray(`\n... and ${fileResults.length - 10} more files`));
            }
            
            console.log(chalk.bold('\n⚠ This will modify your source files!'));
            console.log(chalk.gray('Use --dry-run to preview without making changes'));
        } else {
            // Dry run - show what would be changed
            console.log(chalk.bold('\nDry Run - Files that would be modified:'));
            for (const fileResult of fileResults) {
                console.log(chalk.cyan(`  ${path.relative(projectRoot, fileResult.file)}`) + 
                    chalk.gray(` (${fileResult.wrapped.length} strings)`));
            }
        }

        if (options.dryRun) {
            spinner.info(chalk.yellow('Dry run complete. No files were modified.'));
            return;
        }

        // Confirm before making changes
        const confirmSpinner = ora('Applying changes...').start();

        // Apply changes to each file
        let modifiedCount = 0;
        for (const fileResult of fileResults) {
            const result = wrapper.wrapFile(fileResult.file);
            if (result.modified) {
                modifiedCount++;
            }
        }

        confirmSpinner.succeed(chalk.green(`Modified ${chalk.bold(modifiedCount)} files`));

        // Also update the locale file with the new keys
        const outputDir = path.resolve(projectRoot, config.outputDir);
        const storage = new FileStorage(outputDir);
        
        // Collect all new keys
        const newKeys: Record<string, string> = {};
        for (const fileResult of fileResults) {
            for (const wrapped of fileResult.wrapped) {
                newKeys[wrapped.key] = wrapped.original;
            }
        }

        // Add keys to default locale
        const defaultLocale = config.defaultLocale;
        const existingLocale = storage.loadLocale(defaultLocale);
        let existingData: Record<string, any> = {};
        
        if (existingLocale) {
            existingData = existingLocale.data as Record<string, any>;
        }

        // Merge new keys
        const mergedData = storage.mergeLocaleData(defaultLocale, newKeys);
        storage.saveLocale(defaultLocale, mergedData);

        console.log(chalk.green(`\n✓ Added ${chalk.bold(Object.keys(newKeys).length)} new keys to locales/${defaultLocale}.json`));

        // Show next steps
        console.log(chalk.bold('\nNext steps:'));
        console.log(chalk.gray('  1. Review the changes in your source files'));
        console.log(chalk.gray('  2. Run ') + chalk.cyan('npx lokal translate') + chalk.gray(' to translate to other locales'));
        
    } catch (error) {
        spinner.fail(chalk.red(`Wrap failed: ${error}`));
        if (options.verbose) {
            console.error(error);
        }
        process.exit(1);
    }
}

export function registerWrapCommand(program: Command): void {
    program
        .command('wrap')
        .description('Automatically wrap translatable strings in source files')
        .option('-c, --config <path>', 'Path to config file')
        .option('-s, --src <path>', 'Source directory to scan')
        .option('-f, --function <name>', 'Translation function name', 't')
        .option('-d, --dry-run', 'Preview changes without modifying files', false)
        .option('-v, --verbose', 'Verbose output', false)
        .action(wrapCommand);
}
