# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev      # tsup watch build (esm)
npm run build    # tsup build to dist/
npm run lint     # tsc + oxlint
npm test         # node --test, discovers src/**/*.test.ts
npm run format   # oxfmt
```

Tests use the built-in `node:test` runner with `--experimental-strip-types` — no test dependencies. They sit next to the code (`parse.test.ts`, `save.test.ts`, `utils/*.test.ts`) and work on real temp directories rather than mocking `fs`.

To exercise the CLI locally against a real project: `node dist/index.js -c t-assistant.json` (build first), or `npx tsx src/index.ts ...`.

## Architecture

A single-binary CLI (`bin.t-assistant` → `dist/index.js`, ESM only) that scans source files for translation-function calls and syncs the found keys into per-locale JSON files.

The whole pipeline is three steps, called in order from `src/index.ts`:

1. **`utils/loadConfig.ts`** — when `-c/--config` is passed, reads the JSON config and pushes each value into commander via `setOptionValueWithSource(..., 'config')`, skipping options whose source is `'cli'` — CLI flags beat the config. Because of this, downstream code reads options from `program.opts()`, **not** from the action's `options` argument — the action argument does not carry config-file values. `keyPrefix` exists only in the config file, never as a CLI flag.
2. **`parse.ts`** — globs `src` (minus `exclude`), reads all matches concurrently via `Promise.all`, and throws when nothing matches (an empty key set would otherwise delete every key). Then it runs one regex per file, built from the escaped `keywords` list: group 1 is the function name, groups 2/3/4 are the single-, double- and backtick-quoted key. Keys are unescaped so they match the runtime string; template literals with `${}` are skipped. `keyPrefix` maps a translation function name to a string prepended to every key it produced (e.g. `__mc` → `mailcoach.`). Returns a `Set<string>`.
3. **`save.ts`** — for each locale, merges fresh keys with the existing `<outDir>/<locale>.json`. Existing values win (`{ ...fresh, ...existing }`), keys no longer present in the sources are deleted, and the result is sorted with `localeCompare(..., 'en')` before writing. The sorting is deliberate: it keeps git diffs limited to actual key changes. The locale is pinned because the default follows the system `LANG`, which would make machines reorder each other's files. All locale files are read before any is written: a missing one gets created, an unparsable one aborts the run untouched.

`utils/print.ts` is the only output layer: `print` / `printError` / `printWarning` / `printDebug`, all chalk-styled with optional leading/trailing blank lines. `print` goes to stdout, the other three to stderr. Don't call `console.log` directly outside `save.ts`'s existing per-locale summary line.

Errors bubble to the single try/catch in `index.ts`, which prints the message (plus the stack when `--debug`) and exits 1.

## Gotchas

- `version` is imported from `../package.json` with `resolveJsonModule`; tsup inlines it into the bundle.
- The package ships only `dist/` and no type declarations — it is a CLI with no importable API. Don't re-add `--dts`: tsup's dts worker injects a deprecated `baseUrl` that TS 6 rejects.

## Linting & formatting

`oxlint` (`.oxlintrc.json`) and `oxfmt` (`.oxfmtrc.json`) replaced ESLint and Prettier. Both configs mirror the shared setup used in other projects — keep them in sync rather than tuning locally. Notes:

- `plugins: ["typescript"]` replaces oxlint's default plugin set, so `unicorn`/`oxc` rules are intentionally not active.
- `no-unnecessary-type-parameters` needs type information; without the `oxlint-tsgolint` package it is accepted but inert. It is not installed because `tsc` already runs in `lint`.
- `preserve-caught-error` is the one addition over the shared config — it caught a real bug in `loadConfig.ts`.
- `dist` and `node_modules` are skipped through `.gitignore`, which both tools read by default; `*.md`, `package.json` and `.github` are excluded from formatting explicitly.

## Release

Changesets + GitHub Actions. CI (`lint`, `test`, `build`) runs on every branch; the Publish workflow triggers on a successful CI run on `master` and either opens a version PR or runs `npm run release` (`build && changeset publish`). Add a changeset (`npx changeset`) for any user-facing change — the version in `package.json` is bumped by the tool, not by hand.
