---
't-assistant': minor
---

Update all dependencies, replace ESLint/Prettier with oxlint/oxfmt, and require Node.js >= 22.12.0

- add `glob` to dependencies (it was imported but only resolved transitively)
- bump `chalk` to 6, `commander` to 15, `typescript` to 6
- replace ESLint and Prettier with `oxlint` and `oxfmt`
