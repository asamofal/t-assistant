---
"t-assistant": minor
---

Stop losing translations on bad input, fix wrong keys, and settle the CLI behavior ahead of 1.0

### Breaking Changes

- CLI flags now take precedence over the config file. Previously `-c t-assistant.json -o other` silently ignored `-o`.
- The run fails instead of writing when the `src` pattern matches no files. A typo in `src` used to delete every key from every locale file.
- The run fails instead of overwriting a locale file that is not valid JSON (e.g. unresolved git conflict markers). Nothing is written until every locale file has been read.
- Keys are sorted with a fixed `en` collation. Previously the order followed the system locale, so machines with different `LANG` reordered each other's files. Expect a one-time reorder of keys with non-ASCII characters.
- Errors, warnings and debug output go to stderr.

### Fixes

- Escape sequences in keys are resolved: `t('it\'s')` now produces the key `it's`, matching what `t()` receives at runtime.
- Template literals with interpolation (``t(`Hi ${name}`)``) are skipped instead of producing a `Hi ${name}` key.
- `--help` shows the real binary name, `t-assistant`.

### Other Changes

- `--exclude` accepts several patterns.
- `--debug` prints the options after the config file is applied.
- The package ships only `dist/`, without type declarations.
