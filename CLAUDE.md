# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev      # tsup watch build (esm + dts)
npm run build    # tsup build to dist/
npm run lint     # tsc --noEmit + eslint — this is the CI gate
npm run format   # prettier --write
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

- `glob` is imported in `src/parse.ts` but is **not** listed in `package.json` dependencies — it currently resolves only as a transitive dep of `tsup` (a devDependency). Installed packages will break at runtime. Add it to `dependencies` if you touch that area.
- `version` is imported from `../package.json` with `resolveJsonModule`; tsup inlines it into the bundle.
- The README documents a `command` argument (`t-assistant [options] extract`) but commander defines no subcommands — `extract` is accepted and ignored.

## Release

Changesets + GitHub Actions. CI (`npm run lint && npm run build`) runs on every branch; the Publish workflow triggers on a successful CI run on `master` and either opens a version PR or runs `npm run release` (`build && changeset publish`). Add a changeset (`npx changeset`) for any user-facing change — the version in `package.json` is bumped by the tool, not by hand.
