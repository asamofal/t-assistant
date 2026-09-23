import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { parse } from './parse.ts';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't-assistant-'));
after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

const extract = async (
  source: string,
  keywords: string[] = ['t', '$t'],
  keyPrefix: Record<string, string> = {},
): Promise<string[]> => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, 'case-'));
  const filePath = path.join(dir, 'source.ts');
  fs.writeFileSync(filePath, source);

  const keys = await parse([path.join(dir, '**/*.ts')], [], keywords, keyPrefix);

  return [...keys];
};

describe('delimiters', () => {
  it('extracts a single-quoted key', async () => {
    assert.deepEqual(await extract(`$t('Hello')`), ['Hello']);
  });

  it('extracts a double-quoted key', async () => {
    assert.deepEqual(await extract(`$t("Hello")`), ['Hello']);
  });

  it('extracts a template literal key', async () => {
    assert.deepEqual(await extract('$t(`Hello`)'), ['Hello']);
  });

  it('extracts an empty key', async () => {
    assert.deepEqual(await extract(`$t('')\n$t('Next')`), ['', 'Next']);
  });
});

describe('call boundaries', () => {
  it('extracts consecutive calls', async () => {
    assert.deepEqual(await extract(`$t('First')\n$t('Second')`), ['First', 'Second']);
  });

  it('does not swallow the next call after a trailing comma', async () => {
    assert.deepEqual(await extract(`$t('First',)\n$t('Second')`), ['First', 'Second']);
  });

  it('does not swallow the next call when wrapped with a trailing comma', async () => {
    assert.deepEqual(await extract(`$t(\n  'First',\n)\n$t('Second')`), ['First', 'Second']);
  });

  it('ignores interpolation arguments', async () => {
    assert.deepEqual(await extract(`$t('Open {a}-{b}', { a, b })\n$t('Next')`), [
      'Open {a}-{b}',
      'Next',
    ]);
  });

  it('ignores a multi-line second argument', async () => {
    assert.deepEqual(await extract(`$t('Key', {\n  count: 1,\n})\n$t('Next')`), ['Key', 'Next']);
  });

  it('extracts two calls on one line', async () => {
    assert.deepEqual(await extract(`$t('First') + $t('Second')`), ['First', 'Second']);
  });

  it('extracts a nested call', async () => {
    assert.deepEqual(await extract(`$t('Outer {x}', { x: $t('Inner') })`), ['Outer {x}', 'Inner']);
  });
});

describe('quotes inside keys', () => {
  it('unescapes an escaped quote', async () => {
    assert.deepEqual(await extract(`$t('it\\'s here')\n$t('Next')`), [`it's here`, 'Next']);
  });

  it('extracts an apostrophe inside a double-quoted key', async () => {
    assert.deepEqual(await extract(`$t("Today's time")\n$t('Next')`), [`Today's time`, 'Next']);
  });

  it('extracts a double quote inside a single-quoted key', async () => {
    assert.deepEqual(await extract(`$t('Say "hi"')\n$t('Next')`), ['Say "hi"', 'Next']);
  });

  it('extracts parentheses inside a key', async () => {
    assert.deepEqual(await extract(`$t('Total (net)')\n$t('Next')`), ['Total (net)', 'Next']);
  });

  it('extracts a comma inside a key', async () => {
    assert.deepEqual(await extract(`$t('Hello, world')\n$t('Next')`), ['Hello, world', 'Next']);
  });
});

describe('escape sequences', () => {
  it('unescapes an escaped double quote', async () => {
    assert.deepEqual(await extract(`$t("Say \\"hi\\"")`), ['Say "hi"']);
  });

  it('unescapes an escaped backtick', async () => {
    assert.deepEqual(await extract('$t(`Use \\`code\\``)'), ['Use `code`']);
  });

  it('unescapes an escaped backslash', async () => {
    assert.deepEqual(await extract(`$t('C:\\\\temp')`), ['C:\\temp']);
  });

  it('unescapes control characters', async () => {
    assert.deepEqual(await extract(`$t('Line\\nBreak\\tTab')`), ['Line\nBreak\tTab']);
  });

  it('unescapes unicode and hex sequences', async () => {
    assert.deepEqual(await extract(`$t('\\u00e5 \\u{1F600} \\x41')`), ['\u00e5 \u{1F600} A']);
  });

  it('keeps a key without escapes untouched', async () => {
    assert.deepEqual(await extract(`$t('Plain / text')`), ['Plain / text']);
  });
});

describe('template literals', () => {
  it('skips a template literal with interpolation', async () => {
    assert.deepEqual(await extract("$t(`Hi ${name}`)\n$t('Next')"), ['Next']);
  });

  it('skips a template literal with interpolation spanning lines', async () => {
    assert.deepEqual(await extract("$t(`Hi\n${name}`)\n$t('Next')"), ['Next']);
  });

  it('extracts an escaped interpolation as literal text', async () => {
    assert.deepEqual(await extract('$t(`Price \\${amount}`)'), ['Price ${amount}']);
  });

  it('extracts a template literal with a lone dollar sign', async () => {
    assert.deepEqual(await extract('$t(`Costs $5`)'), ['Costs $5']);
  });
});

describe('malformed source', () => {
  it('skips an unterminated key and recovers on the next call', async () => {
    assert.deepEqual(await extract(`$t('oops\n$t('Next')`), ['Next']);
  });

  it('does not pair quotes across lines', async () => {
    assert.deepEqual(await extract(`$t('oops\nconst x = 1;\n$t('Next')`), ['Next']);
  });

  it('ignores an apostrophe in a comment above a call', async () => {
    assert.deepEqual(await extract(`// don't do this\n$t('Next')`), ['Next']);
  });

  it('ignores a call with a variable argument', async () => {
    assert.deepEqual(await extract(`$t(key)\n$t('Next')`), ['Next']);
  });
});

describe('keyword matching', () => {
  it('ignores a keyword that is part of a longer identifier', async () => {
    assert.deepEqual(await extract(`somet('NotAKey')`), []);
  });

  it('extracts a call preceded by a dot', async () => {
    assert.deepEqual(await extract(`i18n.t('Hello')`), ['Hello']);
  });

  it('escapes regex metacharacters in keywords', async () => {
    assert.deepEqual(await extract(`__mc('Hello')`, ['__mc']), ['Hello']);
  });

  it('allows whitespace between the keyword and the key', async () => {
    assert.deepEqual(await extract(`$t(  'Hello'  )`), ['Hello']);
  });

  it('deduplicates repeated keys', async () => {
    assert.deepEqual(await extract(`$t('Same')\n$t('Same')`), ['Same']);
  });
});

describe('keyPrefix', () => {
  it('prefixes keys of the matching function only', async () => {
    const keys = await extract(`__mc('welcome')\n$t('Next')`, ['__mc', 't', '$t'], {
      __mc: 'mailcoach.',
    });

    assert.deepEqual(keys, ['mailcoach.welcome', 'Next']);
  });
});

describe('file collection', () => {
  it('honours the exclude pattern', async () => {
    const dir = fs.mkdtempSync(path.join(tmpRoot, 'exclude-'));
    fs.writeFileSync(path.join(dir, 'kept.ts'), `$t('Kept')`);
    fs.mkdirSync(path.join(dir, 'dist'));
    fs.writeFileSync(path.join(dir, 'dist', 'skipped.ts'), `$t('Skipped')`);

    const keys = await parse([path.join(dir, '**/*.ts')], ['**/dist/**'], ['t', '$t']);

    assert.deepEqual([...keys], ['Kept']);
  });

  it('accepts a single exclude pattern as a string', async () => {
    const dir = fs.mkdtempSync(path.join(tmpRoot, 'exclude-string-'));
    fs.writeFileSync(path.join(dir, 'kept.ts'), `$t('Kept')`);
    fs.mkdirSync(path.join(dir, 'dist'));
    fs.writeFileSync(path.join(dir, 'dist', 'skipped.ts'), `$t('Skipped')`);

    const keys = await parse([path.join(dir, '**/*.ts')], '**/dist/**', ['t', '$t']);

    assert.deepEqual([...keys], ['Kept']);
  });

  it('honours several exclude patterns', async () => {
    const dir = fs.mkdtempSync(path.join(tmpRoot, 'exclude-many-'));
    fs.writeFileSync(path.join(dir, 'kept.ts'), `$t('Kept')`);
    fs.mkdirSync(path.join(dir, 'dist'));
    fs.writeFileSync(path.join(dir, 'dist', 'skipped.ts'), `$t('Skipped')`);
    fs.writeFileSync(path.join(dir, 'kept.spec.ts'), `$t('Spec')`);

    const keys = await parse(
      [path.join(dir, '**/*.ts')],
      ['**/dist/**', '**/*.spec.ts'],
      ['t', '$t'],
    );

    assert.deepEqual([...keys], ['Kept']);
  });

  it('collects keys across several files', async () => {
    const dir = fs.mkdtempSync(path.join(tmpRoot, 'multi-'));
    fs.writeFileSync(path.join(dir, 'a.ts'), `$t('FromA')`);
    fs.writeFileSync(path.join(dir, 'b.ts'), `$t('FromB')`);

    const keys = await parse([path.join(dir, '**/*.ts')], [], ['t', '$t']);

    assert.deepEqual([...keys].sort(), ['FromA', 'FromB']);
  });
});

describe('no matching files', () => {
  it('throws when the source pattern matches no files', async () => {
    const dir = fs.mkdtempSync(path.join(tmpRoot, 'empty-'));

    await assert.rejects(
      parse([path.join(dir, '**/*.ts')], [], ['t', '$t']),
      /No source files match/,
    );
  });

  it('throws when every matching file is excluded', async () => {
    const dir = fs.mkdtempSync(path.join(tmpRoot, 'all-excluded-'));
    fs.mkdirSync(path.join(dir, 'dist'));
    fs.writeFileSync(path.join(dir, 'dist', 'skipped.ts'), `$t('Skipped')`);

    await assert.rejects(
      parse([path.join(dir, '**/*.ts')], ['**/dist/**'], ['t', '$t']),
      /No source files match/,
    );
  });

  it('throws for an empty source list', async () => {
    await assert.rejects(parse([], [], ['t', '$t']), /No source files match/);
  });
});

describe('idempotency', () => {
  it('returns the same keys on a second run', async () => {
    const dir = fs.mkdtempSync(path.join(tmpRoot, 'idempotent-'));
    fs.writeFileSync(path.join(dir, 'source.ts'), `$t(\n  'First',\n)\n$t('Second')\n$t('Third',)`);

    const pattern = [path.join(dir, '**/*.ts')];
    const first = await parse(pattern, [], ['t', '$t']);
    const second = await parse(pattern, [], ['t', '$t']);

    assert.deepEqual([...first], [...second]);
    assert.deepEqual([...first], ['First', 'Second', 'Third']);
  });
});
