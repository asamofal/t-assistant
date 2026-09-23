import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it, mock } from 'node:test';
import { save } from './save.ts';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't-assistant-save-'));
after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

mock.method(console, 'log', () => {});
mock.method(console, 'error', () => {});

const makeOutDir = (localeFiles: Record<string, string> = {}): string => {
  const outDir = fs.mkdtempSync(path.join(tmpRoot, 'case-'));
  for (const [locale, contents] of Object.entries(localeFiles)) {
    fs.writeFileSync(path.join(outDir, `${locale}.json`), contents);
  }

  return outDir;
};

const readLocale = (outDir: string, locale: string): Record<string, string> => {
  return JSON.parse(fs.readFileSync(path.join(outDir, `${locale}.json`), 'utf-8'));
};

describe('new locale files', () => {
  it('creates a missing locale file with keys as values', () => {
    const outDir = makeOutDir();

    save(['en'], new Set(['Hello']), outDir);

    assert.deepEqual(readLocale(outDir, 'en'), { Hello: 'Hello' });
  });

  it('creates a missing outDir', () => {
    const outDir = path.join(makeOutDir(), 'nested', 'locales');

    save(['en'], new Set(['Hello']), outDir);

    assert.deepEqual(readLocale(outDir, 'en'), { Hello: 'Hello' });
  });

  it('writes one file per locale', () => {
    const outDir = makeOutDir();

    save(['en', 'nb'], new Set(['Hello']), outDir);

    assert.deepEqual(readLocale(outDir, 'en'), { Hello: 'Hello' });
    assert.deepEqual(readLocale(outDir, 'nb'), { Hello: 'Hello' });
  });
});

describe('merging', () => {
  it('keeps existing translations', () => {
    const outDir = makeOutDir({ nb: '{"Hello":"Hei"}' });

    save(['nb'], new Set(['Hello', 'Bye']), outDir);

    assert.deepEqual(readLocale(outDir, 'nb'), { Bye: 'Bye', Hello: 'Hei' });
  });

  it('removes keys no longer found in the sources', () => {
    const outDir = makeOutDir({ nb: '{"Hello":"Hei","Stale":"Gammel"}' });

    save(['nb'], new Set(['Hello']), outDir);

    assert.deepEqual(readLocale(outDir, 'nb'), { Hello: 'Hei' });
  });

  it('sorts keys alphabetically', () => {
    const outDir = makeOutDir();

    save(['en'], new Set(['b', 'Zebra', 'apple']), outDir);

    assert.deepEqual(Object.keys(readLocale(outDir, 'en')), ['apple', 'b', 'Zebra']);
  });

  it('sorts keys the same way regardless of the system locale', () => {
    const outDir = makeOutDir();
    const script = `
      import { save } from ${JSON.stringify(import.meta.resolve('./save.ts'))};
      save(['en'], new Set(['Øre', 'Zebra', 'ä', 'apple', 'Ole']), ${JSON.stringify(outDir)});
    `;

    execFileSync(
      process.execPath,
      ['--experimental-strip-types', '--input-type=module', '-e', script],
      {
        env: { ...process.env, LANG: 'nb_NO.UTF-8', LC_ALL: 'nb_NO.UTF-8' },
        stdio: 'ignore',
      },
    );

    assert.deepEqual(Object.keys(readLocale(outDir, 'en')), ['ä', 'apple', 'Ole', 'Øre', 'Zebra']);
  });

  it('ends the file with a newline', () => {
    const outDir = makeOutDir();

    save(['en'], new Set(['Hello']), outDir);

    assert.ok(fs.readFileSync(path.join(outDir, 'en.json'), 'utf-8').endsWith('}\n'));
  });
});

describe('unreadable locale files', () => {
  const conflicted =
    '{\n<<<<<<< HEAD\n  "Hello": "Hei"\n=======\n  "Hello": "Hallo"\n>>>>>>> main\n}\n';

  it('throws instead of overwriting a malformed file', () => {
    const outDir = makeOutDir({ nb: conflicted });

    assert.throws(() => save(['nb'], new Set(['Hello']), outDir), /Unable to read .*nb\.json/);
    assert.equal(fs.readFileSync(path.join(outDir, 'nb.json'), 'utf-8'), conflicted);
  });

  it('writes no locale file when any of them is malformed', () => {
    const outDir = makeOutDir({ en: '{"Old":"Old"}', nb: conflicted });

    assert.throws(() => save(['en', 'nb'], new Set(['Hello']), outDir));
    assert.deepEqual(readLocale(outDir, 'en'), { Old: 'Old' });
  });

  it('keeps the underlying error as the cause', () => {
    const outDir = makeOutDir({ nb: conflicted });

    try {
      save(['nb'], new Set(['Hello']), outDir);
      assert.fail('expected a throw');
    } catch (e: unknown) {
      assert.ok((e as Error).cause instanceof Error);
    }
  });
});
