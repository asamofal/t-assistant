---
't-assistant': minor
---

Report config problems as errors instead of stack traces

- a missing or malformed config file now prints a single error line; use `--debug` for the stack
- create `outDir` when it does not exist, instead of failing with `ENOENT`
- warn about unknown options in the config file
- reject a `keyPrefix` that is not an object of string values
- name the parse error when a locale file cannot be read, and only warn when the file actually exists
