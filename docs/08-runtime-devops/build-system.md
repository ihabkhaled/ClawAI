# Build System & TypeScript Toolchain (tsgo)

> **Audience:** any engineer or AI agent who needs to build, run, typecheck, or
> debug a service. This is the canonical reference for how ClawAI compiles.

ClawAI does **not** use `tsc` or `nest build` to compile services. It uses
**tsgo** — the Go-native TypeScript compiler shipped as
[`@typescript/native-preview`](https://www.npmjs.com/package/@typescript/native-preview)
— plus **`tsc-alias`** to rewrite path aliases after compilation. This applies
to **all 17 backend services AND all 5 shared packages**. The frontend
(`claw-frontend`) typechecks with tsgo and bundles/tests with Next.js + Vitest 4.

---

## 1. Why tsgo

- **Speed.** tsgo is the native (Go) port of the TypeScript compiler; build and
  typecheck are dramatically faster than `tsc` on this monorepo.
- **One compiler everywhere.** Services and shared packages share the same
  toolchain, so behaviour is consistent across CI, Docker, and local dev.

tsgo is TypeScript 7-era and is stricter about module resolution than the old
`tsc` setup (see [§7 Gotchas](#7-gotchas--troubleshooting)).

---

## 2. How `typescript` resolves

Each workspace's `package.json` does two things:

```jsonc
"devDependencies": {
  "@typescript/native-preview": "^7.0.0-dev.20260421.2", // the tsgo binary
  "typescript": "npm:@typescript/native-preview@beta",   // alias: `typescript` IS tsgo
  "tsc-alias": "^1.8.17"
}
```

- The `typescript` dependency is **aliased** to `@typescript/native-preview`, so
  any tool that imports `typescript` gets tsgo's JS API.
- The **real `tsc` 6.x** is still present transitively (pulled by
  `@nestjs/schematics` / `@prisma/client` overrides) and is what **ts-jest** uses
  to transform backend test files. Both coexist intentionally.
- The platform binary (`@typescript/native-preview-linux-x64`, `-win32-x64`,
  etc.) is an **optional dependency**. The repo's `.npmrc` sets
  `include=optional` so every platform's binary stays in `package-lock.json` —
  this is what lets CI's `npm ci` on Linux resolve the linux binary even though
  the lockfile was last written on Windows.

---

## 3. tsc-alias (why a second step)

tsgo compiles `.ts` → `.js` but does **not** rewrite path aliases. After tsgo
runs, `dist/` still contains `require("@app/...")` / `@common/...` / `@modules/...`.
`tsc-alias` reads the `paths` map from `tsconfig.build.json` and rewrites those
to relative paths (`require("./app/...")`), so `node dist/main.js` resolves with
no runtime path-mapping loader. Shared packages have **no** path aliases, so they
skip `tsc-alias` entirely.

---

## 4. Per-workspace npm scripts

Every backend service uses the same four scripts:

| Script      | Command                                                                                                                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`       | `tsgo -p tsconfig.build.json && tsc-alias -p tsconfig.build.json && concurrently -k -n tsgo,alias,node -c blue,magenta,green "tsgo -p tsconfig.build.json --watch" "tsc-alias -p tsconfig.build.json --watch" "nodemon --watch dist --delay 1500ms --signal SIGTERM dist/main.js"` |
| `build`     | `tsgo -p tsconfig.build.json && tsc-alias -p tsconfig.build.json`                                                                                                                                                                                                                  |
| `typecheck` | `tsgo --noEmit`                                                                                                                                                                                                                                                                    |
| `start`     | `node dist/main.js`                                                                                                                                                                                                                                                                |

`dev` does an initial build, then runs three watchers concurrently: tsgo
(recompile), tsc-alias (re-rewrite paths), and nodemon (restart node on `dist/`
change). The 1500ms nodemon delay debounces the tsgo→tsc-alias write sequence.

**Shared packages** (`packages/*`):

| Script      | Command                                                             |
| ----------- | ------------------------------------------------------------------- |
| `build`     | `tsgo -p tsconfig.build.json`                                       |
| `typecheck` | `tsgo --noEmit`                                                     |
| `lint`      | `eslint src/ --cache --cache-location .eslintcache --concurrency=4` |
| `test`      | `jest --passWithNoTests`                                            |

---

## 5. tsconfig layout

Each workspace has two configs:

- **`tsconfig.json`** — the editor/typecheck config. Key options: `module: Node16`,
  `moduleResolution: Node16`, `strict`, `paths` (`@app/*`, `@common/*`,
  `@modules/*`, `@infrastructure/*`), `types: ["jest", "node"]`. **No `baseUrl`,
  no `moduleResolution: node`, no `ignoreDeprecations`** — tsgo rejects those.
- **`tsconfig.build.json`** — extends `tsconfig.json`, sets `sourceMap: false`,
  and excludes specs: `["node_modules", "dist", "test", "**/*.spec.ts", "**/*.e2e-spec.ts", "**/__tests__/**"]`.
  `build`/`dev` use this; `typecheck` uses `tsconfig.json` (so specs are
  typechecked too).

---

## 6. Docker & CI

### Docker

All images use **`node:26-bookworm-slim`** (Debian/glibc), **never Alpine**:
the tsgo binary and llama.cpp release binaries are glibc-linked and will not run
on musl. Dev `Dockerfile.dev` installs deps at the **workspace root**
(`npm install --ignore-scripts` — `--ignore-scripts` is safe because the tsgo
platform binary is an optional dep, not a postinstall), compiles the 5 shared
packages with `npx tsgo`, runs `prisma generate`, then `npm run dev`. Prod
Dockerfiles are multi-stage (base → deps → builder → runner); the builder runs
`npm run build`, the runner copies `dist/` + `node_modules` and runs
`node dist/main.js` (or a prisma-aware entrypoint). `claw-file-service` and
`claw-llamacpp-service` drop privileges via `runuser` (Debian's `su-exec`
equivalent). See [docker-guide.md](docker-guide.md).

### CI (`.github/workflows/ci.yml`)

Four jobs — **lint, typecheck, test, build** — each a **~23-entry matrix**
(17 services + frontend + 5 shared packages). Every job:

1. `npm ci --ignore-scripts`
2. **`npm rebuild @typescript/native-preview`** — links the tsgo binary (the
   `--ignore-scripts` install skipped it).
3. Build shared packages: `cd packages/<pkg> && npx tsgo -p tsconfig.build.json`
   (in dependency order; shared-types first).
4. `npx prisma generate` (prisma services only).
5. The job step (`npm run lint|typecheck|test|build --workspace=<name>`).

The frontend test job runs `vitest run` directly (no wrapper) and bumps
`NODE_OPTIONS=--max-old-space-size=8192`.

---

## 7. Gotchas & troubleshooting

| Symptom                                                               | Cause / fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TS5108: option 'node' … deprecated` or errors on `baseUrl`           | Old tsconfig. tsgo requires `moduleResolution: Node16`/`nodenext`, relative `paths`, no `baseUrl`, no `ignoreDeprecations`.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `Cannot find module '../x'` on a **dynamic** `await import('../x')`   | Node16 needs an explicit `.js` extension for dynamic relative imports — or convert to a static import.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Third-party lib's named exports "do not exist" under Node16           | The lib publishes extensionless `export *` chains (e.g. **docx**) that Node16 can't traverse. Load it via dynamic `import()` through an `unknown` boundary + a local typed interface, or pin a Node16-friendly version. **pdf-parse v2** is a class API (`new PDFParse({data}).getText()`), not the v1 function.                                                                                                                                                                                                                                              |
| `tsgo: not found` in CI                                               | Missing the `npm rebuild @typescript/native-preview` step.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `Cannot find module '@claw/<pkg>'` in CI                              | The new shared package wasn't added to the "Build shared packages" step in **all four** CI jobs.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `npm ci`: "Missing X from lock file" on Linux                         | A cross-platform optional binary was stripped. Ensure `.npmrc` has `include=optional` and regenerate the lockfile.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Decorator metadata error (`TS1272`)                                   | `isolatedModules: true` + `emitDecoratorMetadata` conflict. Use `isolatedModules: false` (services already do).                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `ReferenceError: __dirname is not defined in ES module scope` at boot | Every service `package.json` is `"type": "module"` (since the NestJS 12 upgrade), so `dist/*.js` is ESM and CommonJS globals (`__dirname`, `__filename`, `require`) do not exist. Use `import.meta.dirname` / `import.meta.filename`. Do **not** register `tsconfig-paths` at runtime — aliases are already rewritten by `tsc-alias -f` at build time, and `tsconfig-paths` only hooks CommonJS `require` anyway. chat-service crash-looped the 2026-09-02 prod rollout on exactly this; its ESLint config now bans both globals via `no-restricted-globals`. |

---

## See also

- [docker-guide.md](docker-guide.md) — container lifecycle, `claw.sh`
- [cicd-pipeline.md](cicd-pipeline.md) — full CI pipeline
- [../04-backend/shared-packages.md](../04-backend/shared-packages.md) — the 5 shared packages
- [port-service-map.md](port-service-map.md) — service ↔ port ↔ database map
