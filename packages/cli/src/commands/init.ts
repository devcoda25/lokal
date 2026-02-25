import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

interface InitOptions {
    locales?: string;
    defaultLocale?: string;
    force?: boolean;
}

/**
 * Create the initial lokal config file and directory structure
 */
export async function initCommand(options: InitOptions): Promise<void> {
    const spinner = ora('Initializing LOKAL...').start();

    try {
        const projectRoot = process.cwd();
        const configPath = path.join(projectRoot, 'lokal.config.js');
        const localesDir = path.join(projectRoot, 'locales');

        // Parse locales
        const locales = options.locales
            ? options.locales.split(',').map(l => l.trim())
            : ['en'];

        const defaultLocale = options.defaultLocale || locales[0];

        // Check if already initialized
        if (fs.existsSync(configPath) && !options.force) {
            spinner.warn(chalk.yellow('LOKAL is already initialized. Use --force to reinitialize.'));
            return;
        }

        // Create config file
        const configContent = `module.exports = {
  // Supported locales
  locales: ${JSON.stringify(locales)},
  
  // Default locale
  defaultLocale: '${defaultLocale}',
  
  // Function name for translations (t("key"))
  functionName: 't',
  
  // Component name for translations (<T>key</T>)
  componentName: 'T',
  
  // Source directory to scan
  sourceDir: './src',
  
  // Output directory for locale files
  outputDir: './locales',
  
  // AI Translation settings (optional)
  // ai: {
  //   provider: 'openai', // or 'gemini'
  //   apiKey: process.env.OPENAI_API_KEY,
  //   model: 'gpt-4'
  // }
};
`;

        fs.writeFileSync(configPath, configContent, 'utf-8');
        spinner.succeed(chalk.green(`Created ${chalk.bold('lokal.config.js')}`));

        // Create locales directory with default locale
        if (!fs.existsSync(localesDir)) {
            fs.mkdirSync(localesDir, { recursive: true });
        }

        // Create default locale file
        const defaultLocalePath = path.join(localesDir, `${defaultLocale}.json`);
        if (!fs.existsSync(defaultLocalePath)) {
            const initialData = {
                _meta: {
                    generated: new Date().toISOString(),
                    description: 'Default locale file'
                }
            };
            fs.writeFileSync(defaultLocalePath, JSON.stringify(initialData, null, 2), 'utf-8');
            spinner.succeed(chalk.green(`Created ${chalk.bold(`locales/${defaultLocale}.json`)}`));
        }

        // Create .gitignore entry for locale files if .gitignore exists
        const gitignorePath = path.join(projectRoot, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
            if (!gitignoreContent.includes('/locales/')) {
                fs.appendFileSync(gitignorePath, '\n# LOKAL translations\nlocales/\n');
                spinner.succeed(chalk.green('Updated .gitignore'));
            }
        }

        console.log(chalk.bold('\n✓ LOKAL initialized successfully!'));
        console.log(chalk.gray('\nNext steps:'));
        console.log(chalk.gray('  1. Add translation strings to your code using t("key") or <T>key</T>'));
        console.log(chalk.gray('  2. Run ') + chalk.cyan('npx lokal scan') + chalk.gray(' to extract strings'));
        console.log(chalk.gray('  3. Run ') + chalk.cyan('npx lokal translate') + chalk.gray(' to translate with AI'));

    } catch (error) {
        spinner.fail(chalk.red(`Failed to initialize: ${error}`));
        process.exit(1);
    }
}

export function registerInitCommand(program: Command): void {
    program
        .command('init')
        .description('Initialize LOKAL in your project')
        .option('-l, --locales <locales>', 'Comma-separated list of locales', 'en')
        .option('-d, --default-locale <locale>', 'Default locale', 'en')
        .option('-f, --force', 'Force reinitialization', false)
        .action(initCommand);
}
