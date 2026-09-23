# t-assistant

![NPM Version](https://img.shields.io/npm/v/t-assistant)
![CI status](https://github.com/asamofal/t-assistant/actions/workflows/ci.yml/badge.svg?branch=master)
![NPM Downloads](https://img.shields.io/npm/dm/t-assistant)

A blazing fast, lightweight tool for i18n: manage translation keys with ease.

- ☁️ **Lightweight**: Minimal dependencies.
- ⚡ **Performant**: Supports simultaneous file parsing.
- ♻️ **git-friendly**: Maintains key persistence with alphabetic sorting, ensuring your git history reflects only actual changes.  

## Installation

Requires Node.js 22.12 or newer.

You can install `t-assistant` using npm:

```sh
npm install -D t-assistant
```

## Usage

For now the primary use of `t-assistant` is to extract translation keys from source files and write them to JSON files.

```sh
t-assistant [options]
```

The recommended way is to create a [config file](t-assistant.example.json) and set up the npm command in `package.json`.
Then it can be called with: `npm run translate`.
```bash
...
"scripts": {
  "translate": "t-assistant -c t-assistant.json",
}
```

> [!IMPORTANT]
> Upgrading from `0.1.x`? Drop the `extract` argument from your command — it was never implemented and is now rejected with `error: too many arguments`. See the [changelog](CHANGELOG.md#020).

## Options

**t-assistant** supports two ways to provide options: via CLI parameters or a config file. 

If the `--config` option is provided, options are loaded from the config file. Flags passed on the command line take precedence over the config values.

Paths are resolved relative to the current working directory, not to the config file.

For more details, check out the config example: [t-assistant.example.json](t-assistant.example.json).

- `-s, --src <src...>`: Glob pattern for source file paths (required)
- `-o, --out-dir <dir>`: JSON locale files path (required)
- `-e, --exclude <exclude...>`: Glob pattern for paths to exclude
- `-l, --locales <locales...>`: List of locales (default: `['en']`)
- `-k, --keywords <keywords...>`: List of translation function names (default: `['t', '$t']`)
- `-c, --config <config>`: Path to a config file
- `-d, --debug`: Print debug information

> Note: There is one additional option available only through the configuration file:
> - `keyPrefix`: Adds a prefix to the translation key based on the translation function.
>
> Example:
> `keyPrefix`: `{ "__mc": "mailcoach." }`, it will add the prefix `"mailcoach."` to every key used in the `__mc` function.

## Examples

Extract translation keys from source files and save them to JSON files:

```sh
t-assistant -s "src/**/*.ts" -o "locales" -l "en" "fr" -k "t" '$t'
```

Keep `$t` in single quotes — in double quotes the shell expands it to an empty string.

## How it works

- Keys are taken from calls with a string literal as the first argument: `t('key')`, `t("key")` or ``t(`key`)``. Calls with a variable or an interpolated template literal (``t(`Hi ${name}`)``) are skipped.
- New keys are added with the key itself as the value, existing values are kept, and keys that no longer appear in the sources are removed.
- Keys are sorted alphabetically, so the order is stable across runs and machines.
- Locale files must be flat JSON objects (`{ "key": "value" }`). Nested objects are not supported — their top-level keys would be removed as unused.
- The run fails without writing anything when the `src` pattern matches no files or a locale file is not valid JSON (e.g. it has unresolved git conflict markers).

## Credits

Special thanks to [@AlexAzartsev](https://github.com/AlexAzartsev) for the original idea and inspiration behind this tool!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
