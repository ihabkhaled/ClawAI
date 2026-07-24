# How to add an AI-family router

1. Copy the shared router shape from `AGENTS.md` into `<TOOL>.md`.
2. Keep it compact — route to canonical sources, do NOT copy policy bodies
   (`knowledge:verify` fails on mirrored bodies / bypass recommendations).
3. Add only a short tool-specific emphasis section.

After any change that affects generated facts, run `npm run knowledge:build` and
`npm run knowledge:verify`. Commit the regenerated `.ai/` alongside your change.
