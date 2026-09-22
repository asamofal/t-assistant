#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../package.json';
import { parse } from './parse';
import chalk from 'chalk';
import { save } from './save';
import { print, printDebug, printError } from './utils/print';
import { applyOptionsFromConfig } from './utils/loadConfig';

const program = new Command();

program
  .name('t-key-assistant')
  .description('Extract translation keys from source files and write them to JSON files.')
  .version(version);

program
  .option('-s, --src <src...>', 'Glob pattern for source file paths')
  .option('-o, --out-dir <dir>', 'JSON locale files path')
  .option('-e, --exclude <exclude>', 'Glob pattern for paths to exclude')
  .option('-l, --locales <locales...>', 'List of locales', ['en'])
  .option('-k, --keywords <keywords...>', 'List of translation keys', ['t', '$t'])
  .option('-c, --config <config>', 'Path to a config file')
  .option('-d, --debug', 'Print debug information')
  // keyPrefix option is available only from the config file
  .action(async (options) => {
    if (options.config) {
      applyOptionsFromConfig(program, options.config);
    }

    if (options.debug) {
      printDebug(`Options: ${JSON.stringify(options)}`);
    }

    try {
      const start = performance.now();

      const { src, outDir, exclude, locales, keywords, keyPrefix } = program.opts();

      // validate required options
      if (!src) {
        printError(`Required option ${chalk.blue('"src"')} is missing`);
        process.exit(1);
      }
      if (!outDir) {
        printError(`Required option ${chalk.blue('"outDir"')} is missing`);
        process.exit(1);
      }

      // parse source files and collect translations
      const keys = await parse(src, exclude, keywords, keyPrefix);

      // merge translations to JSON files
      save(locales, keys, outDir);

      const end = performance.now();
      const executionTime = (end - start).toFixed(2);

      print(`${chalk.green('🚀 Translations updated')} ` + chalk.italic(`(${executionTime}ms)`));
    } catch (e: unknown) {
      const error = e as Error;

      printError(error.message);
      if (options.debug && error.stack) {
        console.error(error.stack);
      }

      process.exit(1);
    }
  });

program.parse(process.argv);
