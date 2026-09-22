---
't-assistant': patch
---

Fix translation keys being silently dropped after a call with a trailing comma

The extraction regex could match past the closing paren of the call it started on, swallowing the next `t()` call and deleting its key from the locale files. Any call wrapped across lines by a formatter (which adds a trailing comma) triggered it.

Template literal keys are now extracted too, and `save` warns before removing keys from a locale file.
