import type { Command } from 'commander';
import fs from 'node:fs';

export const applyOptionsFromConfig = (program: Command, configPath: string) => {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.src) {
      program.setOptionValueWithSource('src', config.src, 'config');
    }
    if (config.outDir) {
      program.setOptionValueWithSource('outDir', config.outDir, 'config');
    }
    if (config.exclude) {
      program.setOptionValueWithSource('exclude', config.exclude, 'config');
    }
    if (config.locales) {
      program.setOptionValueWithSource('locales', config.locales, 'config');
    }
    if (config.keywords) {
      program.setOptionValueWithSource('keywords', config.keywords, 'config');
    }
  } catch (e: unknown) {
    throw new Error(`Unable to read the config file: ${(e as Error).message}`);
  }
};
