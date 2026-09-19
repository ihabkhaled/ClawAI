> **Canonical source:** `docs/14-ai-native-development/how-manifests-are-generated.md`

# How manifests are generated

`npm run knowledge:build` runs the extractors in `tools/lib/extractors.mjs` against
canonical files (package.json, controllers, Prisma schemas, event enum, permission
enum, nginx.conf, docker compose, .env.example, i18n, tests) and writes
`.ai/manifests/*.json`, `.ai/BOOTSTRAP.md`, `.ai/packs/`, and 24 workspace
`AGENTS.md` files.

Facts read directly are tagged `verified`; heuristic inferences (e.g. event
producer/consumer) are tagged `unverified` with the inference method. Never trust
an `unverified` fact without checking source.
ADR: [adr-056](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-056-generated-ai-knowledge-layer.md).

