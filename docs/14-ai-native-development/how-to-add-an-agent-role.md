# How to add an agent role

1. Create `agents/<role>.md` with Role / Mission / Inputs / Canonical files /
   Review sequence / Blocking checklist / Evidence / Verdict.
2. If the role should be auto-recommended, add its name to the relevant task
   pack in `tools/knowledge/classify-task.mjs` (the resolver's reviewers list).
3. State that it never overrides canonical rules.

After any change that affects generated facts, run `npm run knowledge:build` and
`npm run knowledge:verify`. Commit the regenerated `.ai/` alongside your change.
