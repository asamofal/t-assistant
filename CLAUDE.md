# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev      # tsup watch build (esm + dts)
npm run build    # tsup build to dist/
npm run lint     # tsc --noEmit + oxlint — this is the CI gate
npm run format   # oxfmt
```

There is no test suite and no test runner installed. `tsconfig.json` excludes `**/*.test.ts`, so tests were anticipated but never added — if you add any, wire up a runner and a `test` script first.

To exercise the CLI locally against a real project: `node dist/index.js -c t-assistant.json extract` (build first), or `npx tsx src/index.ts ...`.

## Architecture

A single-binary CLI (`bin.t-assistant` → `dist/index.js`, ESM only) that scans source files for translation-function calls and syncs the found keys into per-locale JSON files.

The whole pipeline is three steps, called in order from `src/index.ts`:

1. **`utils/loadConfig.ts`** — when `-c/--config` is passed, reads the JSON config and pushes each value into commander via `setOptionValueWithSource(..., 'config')`. Because of this, downstream code reads options from `program.opts()`, **not** from the action's `options` argument — the action argument does not carry config-file values. `keyPrefix` exists only in the config file, never as a CLI flag.
2. **`parse.ts`** — globs `src` (minus `exclude`), reads all matches concurrently via `Promise.all`, then runs one regex per file. The regex is built from the escaped `keywords` list and captures group 3 as the key; group 4 absorbs an optional second argument (possibly multi-line). `keyPrefix` maps a translation function name to a string prepended to every key it produced (e.g. `__mc` → `mailcoach.`). Returns a `Set<string>`.
3. **`save.ts`** — for each locale, merges fresh keys with the existing `<outDir>/<locale>.json`. Existing values win (`{ ...fresh, ...existing }`), keys no longer present in the sources are deleted, and the result is sorted with `localeCompare` before writing. The sorting is deliberate: it keeps git diffs limited to actual key changes. An unreadable/missing locale file is a warning, not an error — it gets created.

`utils/print.ts` is the only output layer: `print` / `printError` / `printWarning` / `printDebug`, all chalk-styled with optional leading/trailing blank lines. Don't call `console.log` directly outside `save.ts`'s existing per-locale summary line.

Errors bubble to the single try/catch in `index.ts`, which prints the message (plus the stack when `--debug`) and exits 1.

## Gotchas

- `version` is imported from `../package.json` with `resolveJsonModule`; tsup inlines it into the bundle.
- The README documents a `command` argument (`t-assistant [options] extract`). It is declared via `.argument('[command]')` purely so that documented invocation keeps working — the value is ignored. Because an argument is declared, the action handler receives it first: `(_command, options)`.

## TypeScript 6

`tsconfig.json` sets `"ignoreDeprecations": "6.0"`. This is not about our own config — `baseUrl` was removed from it. tsup's dts worker hardcodes `baseUrl: compilerOptions.baseUrl || "."` (`node_modules/tsup/dist/rollup.js`), which TS 6 errors on as deprecated, so `npm run build` fails without it while `tsc` alone passes. Drop the flag once tsup stops injecting `baseUrl`; TS 7 will refuse it outright.

## Linting & formatting

`oxlint` (`.oxlintrc.json`) and `oxfmt` (`.oxfmtrc.json`) replaced ESLint and Prettier. Both configs mirror the shared setup used in other projects — keep them in sync rather than tuning locally. Notes:

- `plugins: ["typescript"]` replaces oxlint's default plugin set, so `unicorn`/`oxc` rules are intentionally not active.
- `no-unnecessary-type-parameters` needs type information; without the `oxlint-tsgolint` package it is accepted but inert. It is not installed because `tsc` already runs in `lint`.
- `preserve-caught-error` is the one addition over the shared config — it caught a real bug in `loadConfig.ts`.
- `dist` and `node_modules` are skipped through `.gitignore`, which both tools read by default; `*.md`, `package.json` and `.github` are excluded from formatting explicitly.

## Release

Changesets + GitHub Actions. CI (`npm run lint && npm run build`) runs on every branch; the Publish workflow triggers on a successful CI run on `master` and either opens a version PR or runs `npm run release` (`build && changeset publish`). Add a changeset (`npx changeset`) for any user-facing change — the version in `package.json` is bumped by the tool, not by hand.
