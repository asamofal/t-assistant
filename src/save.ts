import chalk from 'chalk';
import path from 'node:path';
import fs from 'node:fs';
import { printWarning } from './utils/print';

export const save = (locales: string[], keys: Set<string>, outDir: string) => {
  const freshTranslations = Object.fromEntries(keys.entries());

  for (const locale of locales) {
    const localeFilePath = path.join(outDir, `${locale}.json`);

    let existingTranslations: Record<string, string> = {};
    try {
      existingTranslations = JSON.parse(fs.readFileSync(localeFilePath, 'utf-8'));
    } catch {
      printWarning(`Failed to parse ${chalk.blue(localeFilePath)}. Create a new one.`, {
        newLinesBefore: 1,
        newLinesAfter: 1,
      });
    }

    const allExistingKeys = Object.keys(existingTranslations);
    const allFreshKeys = Object.keys(freshTranslations);

    const deletedKeys = allExistingKeys.filter((key) => !allFreshKeys.includes(key));
    const newKeys = allFreshKeys.filter((key) => !allExistingKeys.includes(key));

    // delete keys that now found in the sources
    deletedKeys.forEach((key) => delete existingTranslations[key]);

    let final = { ...freshTranslations, ...existingTranslations };
    // sort alphabetically to have the same order always
    final = Object.fromEntries(Object.entries(final).sort((a, b) => a[0].localeCompare(b[0])));

    fs.writeFileSync(localeFilePath, JSON.stringify(final, null, 2) + '\n');

    console.log(
      `${chalk.blue(localeFilePath)}: ${chalk.green(newKeys.length)} ↑ | ${chalk.red(deletedKeys.length)} ↓`,
    );
  }
};
