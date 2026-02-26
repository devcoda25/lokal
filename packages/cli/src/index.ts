#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerInitCommand } from './commands/init';
import { registerScanCommand } from './commands/scan';
import { registerTranslateCommand } from './commands/translate';
import { registerWrapCommand } from './commands/wrap';

const program = new Command();

program
    .name('lokal')
    .description('AI-powered localization ecosystem for React and React Native')
    .version('1.0.0');

// Register commands
registerInitCommand(program);
registerScanCommand(program);
registerTranslateCommand(program);
registerWrapCommand(program);

// Global options
program
    .option('-v, --verbose', 'Verbose output')
    .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts();
        if (opts.verbose) {
            process.env.LOKAL_VERBOSE = 'true';
        }
    });

// Handle unknown commands
program.on('command:*', () => {
    console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
    console.log(chalk.gray(`See ${chalk.cyan('--help')} for a list of available commands.`));
    process.exit(1);
});

// Run the program
program.parse(process.argv);
