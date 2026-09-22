# t-assistant

## 0.2.0

### Breaking Changes

**The `extract` argument was removed — drop it from your scripts.**

If your command still passes it, the CLI now fails with:

```
error: too many arguments. Expected 0 arguments but got 1: extract.
```

Remove `extract` from the command:

```diff
  "scripts": {
-   "translate": "t-assistant -c t-assistant.json extract",
+   "translate": "t-assistant -c t-assistant.json",
  }
```

`extract` was never implemented — it was silently ignored by Commander 12, and Commander 15 rejects undeclared arguments. Nothing else about the invocation changes.

Node.js >= 22.12.0 is now required.

### Minor Changes

- 95df2fe: Update all dependencies, replace ESLint/Prettier with oxlint/oxfmt, and require Node.js >= 22.12.0
  
  - add `glob` to dependencies (it was imported but only resolved transitively)
  - bump `chalk` to 6, `commander` to 15, `typescript` to 6
  - replace ESLint and Prettier with `oxlint` and `oxfmt`

## 0.1.1

### Patch Changes

- Add support for new lines in the second parameter

## 0.1.0

### Minor Changes

- Add support for the second optional parameter in translation function

## 0.0.8

### Patch Changes

- e1bb1fb: Update README: add badges, add key-features
- 077bdf7: Add package keywords

## 0.0.7

### Patch Changes

- Update README.md. Add config example.

## 0.0.6

### Patch Changes

- Fix overriding existing translation
