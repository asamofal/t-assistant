import type { Command } from 'commander';
import fs from 'node:fs';
import { printWarning } from './print.ts';

const KNOWN_OPTIONS = ['src', 'outDir', 'exclude', 'locales', 'keywords', 'keyPrefix'] as const;

const isKeyPrefix = (value: unknown): value is Record<string, string> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((prefix) => typeof prefix === 'string');
};

export const applyOptionsFromConfig = (program: Command, configPath: string) => {
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e: unknown) {
    throw new Error(`Unable to read the config file: ${(e as Error).message}`, { cause: e });
  }

  const unknownOptions = Object.keys(config).filter(
    (option) => !KNOWN_OPTIONS.includes(option as (typeof KNOWN_OPTIONS)[number]),
  );
  if (unknownOptions.length > 0) {
    printWarning(`Unknown option(s) in the config file: ${unknownOptions.join(', ')}`, {
      newLinesAfter: 1,
    });
  }

  if (config.keyPrefix !== undefined && !isKeyPrefix(config.keyPrefix)) {
    throw new Error('Invalid config: "keyPrefix" must be an object of string values');
  }

  for (const option of KNOWN_OPTIONS) {
    // CLI flags take precedence over the config file
    if (config[option] !== undefined && program.getOptionValueSource(option) !== 'cli') {
      program.setOptionValueWithSource(option, config[option], 'config');
    }
  }
};
