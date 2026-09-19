> **Canonical source:** `docs/14-ai-native-development/generated-file-policy.md`

# Generated-file policy

Everything under `.ai/` **except `.ai/local/`** is generated and committed.
`.ai/local/` is gitignored (per-developer context bundle). Workspace `AGENTS.md`
files are also generated.

**Never hand-edit a generated file.** Edit the renderer/source and run
`npm run knowledge:build`. `knowledge:check` (and the pre-commit hook) fail if a
generated file drifts from source. See [generated-file-map](https://github.com/ihabkhaled/ClawAI/blob/main/context/generated-file-map.md).

