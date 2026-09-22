import chalk from 'chalk';
import path from 'node:path';
import fs from 'node:fs';
import { printWarning } from './utils/print.ts';

export const save = (locales: string[], keys: Set<string>, outDir: string) => {
  const freshTranslations = Object.fromEntries(keys.entries());

  fs.mkdirSync(outDir, { recursive: true });

  for (const locale of locales) {
    const localeFilePath = path.join(outDir, `${locale}.json`);

    let existingTranslations: Record<string, string> = {};
    if (fs.existsSync(localeFilePath)) {
      try {
        existingTranslations = JSON.parse(fs.readFileSync(localeFilePath, 'utf-8'));
      } catch (e: unknown) {
        // keep going with an empty set, but the existing translations are lost
        printWarning(
          `Failed to parse ${chalk.blue(localeFilePath)}: ${(e as Error).message}. ` +
            'Its translations will be recreated as empty.',
          { newLinesBefore: 1, newLinesAfter: 1 },
        );
      }
    }

    const allExistingKeys = Object.keys(existingTranslations);
    const allFreshKeys = Object.keys(freshTranslations);

    const deletedKeys = allExistingKeys.filter((key) => !allFreshKeys.includes(key));
    const newKeys = allFreshKeys.filter((key) => !allExistingKeys.includes(key));

    // delete keys that now found in the sources
    deletedKeys.forEach((key) => delete existingTranslations[key]);

    if (deletedKeys.length > 0) {
      const keyList = deletedKeys.map((key) => `  - ${chalk.red(key)}`).join('\n');
      printWarning(
        `Removing ${deletedKeys.length} key(s) from ${chalk.blue(localeFilePath)}:\n${keyList}`,
        { newLinesBefore: 1, newLinesAfter: 1 },
      );
    }

    let final = { ...freshTranslations, ...existingTranslations };
    // sort alphabetically to have the same order always
    final = Object.fromEntries(Object.entries(final).sort((a, b) => a[0].localeCompare(b[0])));

    fs.writeFileSync(localeFilePath, JSON.stringify(final, null, 2) + '\n');

    console.log(
      `${chalk.blue(localeFilePath)}: ${chalk.green(newKeys.length)} ↑ | ${chalk.red(deletedKeys.length)} ↓`,
    );
  }
};
