import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { print, printDebug, printError, printWarning } from './print.ts';

let stdout: ReturnType<typeof mock.method>;
let stderr: ReturnType<typeof mock.method>;

beforeEach(() => {
  stdout = mock.method(console, 'log', () => {});
  stderr = mock.method(console, 'error', () => {});
});

afterEach(() => mock.restoreAll());

describe('streams', () => {
  it('writes regular output to stdout', () => {
    print('Done');

    assert.equal(stdout.mock.callCount(), 1);
    assert.equal(stderr.mock.callCount(), 0);
  });

  it('writes errors to stderr', () => {
    printError('Broken');

    assert.equal(stdout.mock.callCount(), 0);
    assert.equal(stderr.mock.callCount(), 1);
  });

  it('writes warnings to stderr', () => {
    printWarning('Careful');

    assert.equal(stdout.mock.callCount(), 0);
    assert.equal(stderr.mock.callCount(), 1);
  });

  it('writes debug output to stderr', () => {
    printDebug('Details');

    assert.equal(stdout.mock.callCount(), 0);
    assert.equal(stderr.mock.callCount(), 1);
  });
});

describe('blank lines', () => {
  it('surrounds the message with the requested blank lines', () => {
    print('Done', { newLinesBefore: 1, newLinesAfter: 2 });

    assert.equal(stdout.mock.calls[0]?.arguments[0], '\nDone\n\n');
  });
});
