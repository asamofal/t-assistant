import { glob } from 'glob';
import fs from 'node:fs';

export const parse = async (
  src: string[],
  exclude: string[],
  keywords: string[],
  keyPrefix: Record<string, string> = {},
): Promise<Set<string>> => {
  const keys: Set<string> = new Set();

  // collect target file paths
  const filePaths: string[] = await glob(src, { ignore: exclude, nodir: true });

  // collect file contents
  const fileContents = await Promise.all(
    filePaths.map((filePath) => fs.promises.readFile(filePath, 'utf-8')),
  );

  // extract translation keys from file contents
  const escapedKeywords = keywords.map((keyword) => {
    return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  for (const fileContent of fileContents) {
    const regex = new RegExp(
      `(?<!\\w)(${escapedKeywords.join('|')})\\(\\s*(['"])(.+?)\\2\\s*(?:,\\s*([\\s\\S]+?))?\\s*\\)`,
      'gm',
    );

    let match;
    while ((match = regex.exec(fileContent)) !== null) {
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      let translationKey = match[3] as string;

      const translationFunction = match[1] as string;
      if (translationFunction in keyPrefix) {
        translationKey = `${keyPrefix[translationFunction]}${translationKey}`;
      }

      keys.add(translationKey);
    }
  }

  return keys;
};
