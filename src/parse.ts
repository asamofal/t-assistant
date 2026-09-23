import { glob } from 'glob';
import fs from 'node:fs';

const SIMPLE_ESCAPES: Record<string, string> = {
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
  0: '\0',
};

// resolve escape sequences, so the key matches the string `t()` receives at runtime
const unescapeKey = (rawKey: string): string => {
  return rawKey.replace(
    /\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([\s\S]))/g,
    (_match, codePoint?: string, unicode?: string, hex?: string, char = '') => {
      const hexCode = codePoint ?? unicode ?? hex;
      if (hexCode !== undefined) {
        return String.fromCodePoint(parseInt(hexCode, 16));
      }

      return SIMPLE_ESCAPES[char] ?? char;
    },
  );
};

const hasInterpolation = (templateKey: string): boolean => /(?<!\\)\$\{/.test(templateKey);

export const parse = async (
  src: string[],
  exclude: string | string[] = [],
  keywords: string[],
  keyPrefix: Record<string, string> = {},
): Promise<Set<string>> => {
  const keys: Set<string> = new Set();

  // collect target file paths
  const filePaths: string[] = await glob(src, { ignore: exclude, nodir: true });
  if (filePaths.length === 0) {
    throw new Error(`No source files match ${src.join(', ')}`);
  }

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
      // the alternation keeps each quote style bounded to its own literal
      `(?<!\\w)(${escapedKeywords.join('|')})\\(\\s*(?:'((?:\\\\.|[^'\\\\\\n])*)'|"((?:\\\\.|[^"\\\\\\n])*)"|\`((?:\\\\.|[^\`\\\\])*)\`)`,
      'gm',
    );

    let match;
    while ((match = regex.exec(fileContent)) !== null) {
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      const templateKey = match[4];
      if (templateKey !== undefined && hasInterpolation(templateKey)) {
        continue;
      }

      let translationKey = unescapeKey((match[2] ?? match[3] ?? templateKey) as string);

      const translationFunction = match[1] as string;
      if (translationFunction in keyPrefix) {
        translationKey = `${keyPrefix[translationFunction]}${translationKey}`;
      }

      keys.add(translationKey);
    }
  }

  return keys;
};
