# Troubleshooting context resolution

- **Empty / weak affected workspaces:** pass `--service=<name>` to scope it, or
  write a fuller `--task`. The resolver warns in "Missing / ambiguous".
- **Stale facts:** run `npm run knowledge:build` — the manifests may be behind
  source. `knowledge:check` tells you if they are.
- **Wrong task pack:** the classifier is keyword-based; add terms to your task or
  extend `tools/knowledge/classify-task.mjs`.
- **Broken link in verify:** the target file was moved/renamed — fix the link or
  create the target. `knowledge:verify` prints the exact file -> target.
