import { Command } from 'commander';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { applyOptionsFromConfig } from './loadConfig.ts';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't-assistant-config-'));
after(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

const writeConfig = (contents: string): string => {
  const dir = fs.mkdtempSync(path.join(tmpRoot, 'case-'));
  const configPath = path.join(dir, 'config.json');
  fs.writeFileSync(configPath, contents);

  return configPath;
};

const applyConfig = (contents: string, cliArgs: string[] = []): Command => {
  const program = new Command();
  program
    .option('-s, --src <src...>')
    .option('-o, --out-dir <dir>')
    .option('-l, --locales <locales...>', '', ['en'])
    .parse(cliArgs, { from: 'user' });

  applyOptionsFromConfig(program, writeConfig(contents));

  return program;
};

describe('option loading', () => {
  it('applies known options', () => {
    const program = applyConfig('{"src":["src/**/*.ts"],"outDir":"locales"}');

    assert.deepEqual(program.opts().src, ['src/**/*.ts']);
    assert.equal(program.opts().outDir, 'locales');
  });

  it('applies keyPrefix, which has no CLI flag', () => {
    const program = applyConfig('{"keyPrefix":{"__mc":"mailcoach."}}');

    assert.deepEqual(program.opts().keyPrefix, { __mc: 'mailcoach.' });
  });

  it('leaves defaults untouched when an option is absent', () => {
    const program = applyConfig('{"src":["src/**/*.ts"]}');

    assert.deepEqual(program.opts().locales, ['en']);
  });

  it('applies a falsy option value', () => {
    const program = applyConfig('{"src":[],"outDir":""}');

    assert.deepEqual(program.opts().src, []);
    assert.equal(program.opts().outDir, '');
  });
});

describe('precedence', () => {
  it('lets a CLI flag override the config value', () => {
    const program = applyConfig('{"outDir":"from-config"}', ['-o', 'from-cli']);

    assert.equal(program.opts().outDir, 'from-cli');
  });

  it('lets a variadic CLI flag override the config value', () => {
    const program = applyConfig('{"locales":["en","nb"]}', ['-l', 'uk']);

    assert.deepEqual(program.opts().locales, ['uk']);
  });

  it('lets the config override a default value', () => {
    const program = applyConfig('{"locales":["en","nb"]}');

    assert.deepEqual(program.opts().locales, ['en', 'nb']);
  });

  it('applies config values for flags not passed on the CLI', () => {
    const program = applyConfig('{"src":["src/**/*.ts"],"outDir":"from-config"}', [
      '-o',
      'from-cli',
    ]);

    assert.deepEqual(program.opts().src, ['src/**/*.ts']);
    assert.equal(program.opts().outDir, 'from-cli');
  });
});

describe('unknown options', () => {
  it('ignores an unknown option but keeps the known ones', () => {
    const program = applyConfig('{"srcc":["oops"],"outDir":"locales"}');

    assert.equal(program.opts().srcc, undefined);
    assert.equal(program.opts().outDir, 'locales');
  });
});

describe('keyPrefix validation', () => {
  it('rejects a non-object keyPrefix', () => {
    assert.throws(
      () => applyConfig('{"keyPrefix":"mailcoach."}'),
      /must be an object of string values/,
    );
  });

  it('rejects an array keyPrefix', () => {
    assert.throws(
      () => applyConfig('{"keyPrefix":["mailcoach."]}'),
      /must be an object of string values/,
    );
  });

  it('rejects a keyPrefix with a non-string value', () => {
    assert.throws(
      () => applyConfig('{"keyPrefix":{"__mc":42}}'),
      /must be an object of string values/,
    );
  });

  it('accepts an empty keyPrefix', () => {
    const program = applyConfig('{"keyPrefix":{}}');

    assert.deepEqual(program.opts().keyPrefix, {});
  });
});

describe('unreadable config', () => {
  it('throws a readable error for malformed JSON', () => {
    assert.throws(() => applyConfig('{"src": [,}'), /Unable to read the config file/);
  });

  it('throws a readable error for a missing file', () => {
    const program = new Command();

    assert.throws(
      () => applyOptionsFromConfig(program, path.join(tmpRoot, 'nope.json')),
      /Unable to read the config file/,
    );
  });

  it('keeps the underlying error as the cause', () => {
    try {
      applyConfig('{"src": [,}');
      assert.fail('expected a throw');
    } catch (e: unknown) {
      assert.ok((e as Error).cause instanceof Error);
    }
  });
});
