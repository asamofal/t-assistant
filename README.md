# t-assistant

![NPM Version](https://img.shields.io/npm/v/t-assistant)
![CI status](https://github.com/asamofal/t-assistant/actions/workflows/ci.yml/badge.svg?branch=master)
![NPM Downloads](https://img.shields.io/npm/dm/t-assistant)

A blazing fast, lightweight tool for i18n: manage translation keys with ease.

- ☁️ **Lightweight**: Minimal dependencies.
- ⚡ **Performant**: Supports simultaneous file parsing.
- ♻️ **git-friendly**: Maintains key persistence with alphabetic sorting, ensuring your git history reflects only actual changes.  

## Installation

You can install `t-assistant` using npm:

```sh
npm install -D t-assistant
```

## Usage

For now the primary use of `t-assistant` is to extract translation keys from source files and write them to JSON files.

```sh
t-assistant [options] command
```

The recommended way is to create a [config file](t-assistant.example.json) and set up the npm command in `package.json`.
Then it can be called with: `npm run translate`.
```bash
...
"scripts": {
  "translate": "t-assistant -c t-assistant.json extract",
}
```

## Options

**t-assistant** supports two ways to provide options: via CLI parameters or a config file. 

If the `--config` option provided, all other options will be loaded from the config file.

For more details, check out the config example: [t-assistant.example.json](t-assistant.example.json).

- `-s, --src <src...>`: Glob pattern for source file paths (required)
- `-o, --out-dir <dir>`: JSON locale files path (required)
- `-e, --exclude <exclude>`: Glob pattern for paths to exclude
- `-l, --locales <locales...>`: List of locales (default: `['en']`)
- `-k, --keywords <keywords...>`: List of translation keys (default: `['t', '$t']`)
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
t-assistant -s "src/**/*.ts" -o "locales" -l "en" "fr" -k "t" "$t"
```

## Credits

Special thanks to [@AlexAzartsev](https://github.com/AlexAzartsev) for the original idea and inspiration behind this tool!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
