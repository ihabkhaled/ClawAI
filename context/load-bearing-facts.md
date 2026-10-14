# Load-bearing facts that surprise people

Short facts that cost an agent hours when missed. Each links to its canonical
home; this page only collects them. Routed from [`AGENTS.md`](../AGENTS.md).

- **TypeScript compiles with TypeScript 7** — the `typescript7` npm alias, run
  through `tools/typescript/run-ts7.mjs` — plus `tsc-alias`; not `nest build`.
  `npm run build` / `npm run typecheck` wrap it per workspace. ESLint stays on the
  TypeScript 6 API until typescript-eslint supports 7
  ([rules/48](../rules/48-lint-and-test-only-what-changed.md#typescript-runs-side-by-side-deliberately)).
- **Docker images are `node:26-bookworm-slim`** (glibc), not Alpine — the
  TypeScript 7 compiler and llama.cpp binaries are not musl-compatible.
- **`./scripts/claw.sh up` is the only supported way to start the stack.** It
  stitches the split compose files and applies the right GPU overlay.
- **Prices are never environment variables.** They live in `PlanPriceVersion`
  rows; a price change creates a new immutable version
  ([rules/28](../rules/28-billing-integrity-and-api-contracts.md)).
- **Money is integer minor units; provider cost is integer micro-USD.** Floating
  point is banned in every billing path.
- **`null` means unlimited, `0` means disabled.** They are not interchangeable.
- **A gateway is enabled only when its whole credential set is present.** A blank
  value in `.env` means unset, not empty string.
- **`t()` is not type-safe against `TranslationDictionary`.** A wrong key compiles
  and renders the raw key — check the key chain in `i18n.types.ts`
  ([rules/20](../rules/20-i18n-and-user-facing-messages.md)).
- **Generated artifacts are a hard gate.** `.ai/**`, workspace `AGENTS.md`, the
  per-model routers and the inventory snapshot are generated; the pre-commit hook
  regenerates and stages them ([rules/24](../rules/24-generated-files-and-knowledge-freshness.md)).
- **A dev container's `dist/generated/prisma` is copied, not compiled.** After a
  schema change the entrypoint refreshes it; a stale copy shows up as
  `z.nativeEnum(undefined)` at boot.
- **A new service needs the production `.env` too.** The live stack reads
  `/srv/clawai/.env`, written before the service existed; the deploy never starts
  databases or invents secrets. Declare the service's passwords, URLs and keys in
  `scripts/prod-required-env.manifest`; `scripts/ensure-prod-env.sh` appends what is
  missing and never rewrites a value
  ([skills/add-a-new-service.md](../skills/add-a-new-service.md)).
- **`files.content` is base64 of the uploaded bytes, not extracted text.** The
  readable text is `files.extractedText`
  ([ADR-095](../docs/13-adr/adr-095-attachment-text-extraction-pipeline.md)).
- **Shared packages are consumed through their `dist/`.** A dependent compiled
  against an old `dist` proves nothing; the hooks rebuild stale shared packages
  in dependency order ([rules/34](../rules/34-gate-economy-and-machine-resources.md)).
