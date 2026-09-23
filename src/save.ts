import chalk from 'chalk';
import path from 'node:path';
import fs from 'node:fs';
import { printWarning } from './utils/print.ts';

const readLocaleFile = (localeFilePath: string): Record<string, string> => {
  if (!fs.existsSync(localeFilePath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(localeFilePath, 'utf-8'));
  } catch (e: unknown) {
    throw new Error(
      `Unable to read ${localeFilePath}: ${(e as Error).message}. Fix the file and run again`,
      { cause: e },
    );
  }
};

export const save = (locales: string[], keys: Set<string>, outDir: string) => {
  const freshTranslations = Object.fromEntries(keys.entries());

  // read every locale file up front, so a broken one aborts the run before anything is written
  const localeFiles = locales.map((locale) => {
    const localeFilePath = path.join(outDir, `${locale}.json`);

    return { localeFilePath, existingTranslations: readLocaleFile(localeFilePath) };
  });

  fs.mkdirSync(outDir, { recursive: true });

  for (const { localeFilePath, existingTranslations } of localeFiles) {
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
    // sort alphabetically to have the same order always, regardless of the system locale
    final = Object.fromEntries(
      Object.entries(final).sort((a, b) => a[0].localeCompare(b[0], 'en')),
    );

    fs.writeFileSync(localeFilePath, JSON.stringify(final, null, 2) + '\n');

    console.log(
      `${chalk.blue(localeFilePath)}: ${chalk.green(newKeys.length)} ↑ | ${chalk.red(deletedKeys.length)} ↓`,
    );
  }
};
