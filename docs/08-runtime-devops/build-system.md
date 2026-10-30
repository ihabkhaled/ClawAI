# Build System & TypeScript Toolchain (TypeScript 7)

> **Audience:** any engineer or AI agent who needs to build, run, typecheck, or
> debug a service. This is the canonical reference for how ClawAI compiles.

ClawAI does **not** use `nest build` to compile services. It compiles with
**TypeScript 7** — the Go-native TypeScript compiler, installed at the root as
the **`typescript7`** alias (`"typescript7": "npm:typescript@7.x"`) and invoked
through [`tools/typescript/run-ts7.mjs`](../../tools/typescript/run-ts7.mjs) —
plus **`tsc-alias`** to rewrite path aliases after compilation. This applies to
**all <!-- count:services -->21<!-- /count --> backend services AND all
<!-- count:sharedPackages -->6<!-- /count --> shared packages**. The frontend

(`claw-frontend`) typechecks with TypeScript 7 (`apps/claw-frontend/scripts/typecheck-ts7.mjs`) and
bundles/tests with Next.js + Vitest.

You never call the compiler directly: `npm run build` / `npm run typecheck` in a
workspace wrap it, and the git hooks run them for you
([rules/23](../../rules/23-git-commits-hooks-and-release-gates.md#gate-matrix-by-change-type)).

---

## 1. Why TypeScript 7

- **Speed.** TypeScript 7 is the native (Go) port of the TypeScript compiler;
  build and typecheck are dramatically faster than the JavaScript `tsc` 6.x on
  this monorepo.
- **One compiler everywhere.** Services and shared packages share the same
  toolchain, so behaviour is consistent across CI, Docker, and local dev.

TypeScript 7 is stricter about module resolution than the old `tsc` setup (see
[§7 Gotchas](#7-gotchas--troubleshooting)).

---

## 2. How `typescript` resolves

Two TypeScript versions coexist on purpose:

```jsonc
// root package.json devDependencies
"typescript": "6.0.3",                  // the JS API, for typescript-eslint and other tooling
"typescript7": "npm:typescript@7.0.2",  // the compiler every build and typecheck runs
```

- **`typescript7`** is what compiles. `tools/typescript/run-ts7.mjs` resolves
  `typescript7/package.json` and runs its `bin/tsc` with the arguments it was
  given, so a workspace script reads
  `node ../../tools/typescript/run-ts7.mjs -p tsconfig.build.json`.
- **`typescript` 6.x** stays for tools that import the TypeScript JS API
  (`typescript-eslint`, editors). Each workspace also pins it as a
  devDependency next to `tsc-alias`.
- CI's setup job checks the compiler with
  `node tools/typescript/run-ts7.mjs --version` before anything else runs.

---

## 3. tsc-alias (why a second step)

The compiler emits `.ts` → `.js` but does **not** rewrite path aliases. After it
runs, `dist/` still contains imports of `@app/...` / `@common/...` / `@modules/...`.
`tsc-alias -f` reads the `paths` map from `tsconfig.build.json`, rewrites those
to relative paths, and adds the `.js` extensions ESM needs, so
`node dist/main.js` resolves with no runtime path-mapping loader. Prisma-backed
services run `tools/typescript/copy-generated-prisma.mjs` between the compile and
the `tsc-alias` pass, so `dist/generated/prisma` exists when the extensions are
resolved.

---

## 4. Per-workspace npm scripts

Backend services (`apps/claw-auth-service/package.json` is representative):

| Script      | Command                                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`       | `nodemon --legacy-watch --watch src --ext ts,json --delay 1500ms --signal SIGTERM --exec "npm run build && node dist/main.js"`                                   |
| `build`     | `node ../../tools/typescript/run-ts7.mjs -p tsconfig.build.json && node ../../tools/typescript/copy-generated-prisma.mjs && tsc-alias -p tsconfig.build.json -f` |
| `typecheck` | `node ../../tools/typescript/run-ts7.mjs --noEmit --incremental --tsBuildInfoFile node_modules/.cache/tsc/typecheck.tsbuildinfo`                                 |
| `start`     | `node dist/main.js`                                                                                                                                              |

`dev` watches `src/` and, on every change, rebuilds and restarts node. The
1500ms nodemon delay debounces bursts of saves. (Services without Prisma omit the
`copy-generated-prisma.mjs` step.)

**Shared packages** (`packages/*`):

| Script      | Command                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `build`     | `node ../../tools/typescript/run-ts7.mjs -p tsconfig.build.json && tsc-alias -p tsconfig.build.json -f`                          |
| `typecheck` | `node ../../tools/typescript/run-ts7.mjs --noEmit --incremental --tsBuildInfoFile node_modules/.cache/tsc/typecheck.tsbuildinfo` |
| `lint`      | `eslint src/ --cache --cache-strategy content --cache-location node_modules/.cache/eslint/`                                      |
| `test`      | `vitest run` (an empty suite fails)                                                                                              |

---

## 5. tsconfig layout

Each workspace has two configs:

- **`tsconfig.json`** — the editor/typecheck config. Key options: `module: Node16`,
  `moduleResolution: Node16`, `strict`, `paths` (`@app/*`, `@common/*`,
  `@modules/*`, `@infrastructure/*`), `types: ["node"]` (Vitest globals come from `src/vitest-globals.d.ts`). **No `baseUrl`,
  no `moduleResolution: node`, no `ignoreDeprecations`** — TypeScript 7 rejects those.
- **`tsconfig.build.json`** — extends `tsconfig.json`, sets `sourceMap: false`,
  and excludes specs: `["node_modules", "dist", "test", "**/*.spec.ts", "**/*.e2e-spec.ts", "**/__tests__/**"]`.
  `build`/`dev` use this; `typecheck` uses `tsconfig.json` (so specs are
  typechecked too).

---

## 6. Docker & CI

### Docker

All images use **`node:26-bookworm-slim`** (Debian/glibc), **never Alpine**:
the native compiler and llama.cpp release binaries are glibc-linked and will not
run on musl. Dev `Dockerfile.dev` installs deps at the **workspace root**
(`npm install --ignore-scripts`), builds each shared package the service uses
with `RUN cd packages/<pkg> && npm run build`, runs `prisma generate`, then the
entrypoint runs migrations and `npm run dev`. Prod Dockerfiles are multi-stage
(base → deps → builder → runner); the builder runs `npm run build`, the runner
copies `dist/` + `node_modules` and runs `node dist/main.js` (or a prisma-aware
entrypoint). `claw-file-service` and `claw-llamacpp-service` drop privileges via
`runuser` (Debian's `su-exec` equivalent). See [docker-guide.md](docker-guide.md).

### CI (`.github/workflows/ci.yml`)

A **setup** job installs once (`npm ci --ignore-scripts`, cached), verifies the
compiler (`node tools/typescript/run-ts7.mjs --version`), builds the shared
packages in dependency order (`node tools/affected/index.mjs shared-build` — the
order is derived from each `package.json`, never hard-coded), generates every
Prisma client, and uploads `packages/*/dist` + `apps/*/src/generated` as an
artifact. The per-workspace jobs (static = lint ratchet + typecheck, test, build)
run over the **affected** matrix only and restore that artifact through
`.github/actions/prepare`. Job by job:
[ci-cd-pipeline.md](ci-cd-pipeline.md).

---

### Node.js runtime floor (ADR-196)

Every `FROM node:` stage in every Dockerfile is followed by one guard `RUN` that fails the build when
the base image is older than the fixed Node versions of the 2026-10-21 security release (22.23.4,
24.22.1, 26.12.1). The floors live in `tools/security/node-runtime-floor.mjs`; root `package.json`
`engines` is the same range. `deploy-prod.sh` builds with `--pull`. To raise a floor, follow
[runbook-node-runtime-floor](../11-runbooks/runbook-node-runtime-floor.md).

## 7. Gotchas & troubleshooting

| Symptom                                                                                           | Cause / fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot find module '@claw/shared-<x>'` while building a service image                            | Declare the workspace in the service `package.json`, then build it in both `Dockerfile` and `Dockerfile.dev`. `tools/__tests__/dockerfile-shared-package-completeness.test.mjs` checks declared packages against both image recipes.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `TS5108: option 'node' … deprecated` or errors on `baseUrl`                                       | Old tsconfig. TypeScript 7 requires `moduleResolution: Node16`/`nodenext`, relative `paths`, no `baseUrl`, no `ignoreDeprecations`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `Cannot find module '../x'` on a **dynamic** `await import('../x')`                               | Node16 needs an explicit `.js` extension for dynamic relative imports — or convert to a static import.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Third-party lib's named exports "do not exist" under Node16                                       | The lib publishes extensionless `export *` chains (e.g. **docx**) that Node16 can't traverse. Load it via dynamic `import()` through an `unknown` boundary + a local typed interface, or pin a Node16-friendly version. **pdf-parse v2** is a class API (`new PDFParse({data}).getText()`), not the v1 function.                                                                                                                                                                                                                                                                                                                               |
| `Cannot find module 'typescript7/package.json'`                                                   | Dependencies are not installed at the root — `typescript7` is a root devDependency. Run `npm ci` at the repository root; CI's setup job checks it with `node tools/typescript/run-ts7.mjs --version`.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `Cannot find module '@claw/<pkg>'` in CI                                                          | The service does not declare the package in its `package.json`, so it is missing from the shared-build order (`node tools/affected/index.mjs shared-build`) and from the CI build artifact.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `npm ci`: "Missing X from lock file" on Linux                                                     | A cross-platform optional binary was stripped. Ensure `.npmrc` has `include=optional` and regenerate the lockfile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Decorator metadata error (`TS1272`)                                                               | `isolatedModules: true` + `emitDecoratorMetadata` conflict. Use `isolatedModules: false` (services already do).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `<lib>.<fn> is not a function` at runtime, for a library imported as `import * as x from '<lib>'` | Every workspace is `"type": "module"`. Under real ESM a CommonJS package's namespace holds only what `cjs-module-lexer` could statically detect; the real `module.exports` sits on `.default`. It is per-package: `argon2` exposes everything, `jsonwebtoken` exposes `decode` alone, so `jwt.verify` was `undefined` and 401'd every request in prod on 2026-09-02. Use a **default** import (`import jwt from 'jsonwebtoken'`). Unit tests do **not** catch this (ts-jest used to transpile specs to CommonJS; Vitest's default `deps.interopDefault` can likewise mask it) — `tools/__tests__/esm-namespace-import-bindings.test.mjs` does. |
| `SyntaxError: The requested module '<lib>' does not provide an export named 'X'` at boot          | A named import of a CommonJS export that `cjs-module-lexer` did not detect. Per-NAME, not per-package: mongoose re-exports `Model` and `Schema` but not `Connection`. Use `import type { X }` when it is only a type. What usually keeps the import alive at all is a constructor parameter typed with it — `emitDecoratorMetadata` writes the class into `design:paramtypes`, so a file that looks type-only still emits a runtime import. Guarded by `tools/__tests__/esm-namespace-import-bindings.test.mjs`. Took three Mongo services down, 2026-09-02.                                                                                   |
| `ReferenceError: Cannot access 'X' before initialization` at boot                                 | A circular import. CommonJS tolerated it (a partially filled `exports` object); ESM leaves the binding in a temporal dead zone. `forwardRef(() => X)` is a lazy closure and is NOT the cause — the eager read is the `design:paramtypes` metadata for a constructor parameter typed as the class. Type that parameter with an interface from `types/` so the metadata emits `Object`. See rule 13 §8. file-service, 2026-09-02.                                                                                                                                                                                                                |
| `ERR_MODULE_NOT_FOUND …/packages/shared-<x>/dist/<file>` (no `.js`) in a **dev** container only   | The image copied the host's stale `packages/shared-<x>/dist` (emitted before `tsc-alias -f` added `.js` extensions) because that service's `Dockerfile.dev` never builds `shared-<x>`. Add the `RUN cd packages/shared-<x> && npm run build` line to BOTH Dockerfiles; `tools/__tests__/dockerfile-shared-package-completeness.test.mjs` enforces it. See [docker-guide.md](docker-guide.md#err_module_not_found-for-packagesshared-distfile-no-js-extension).                                                                                                                                                                                 |
| `ReferenceError: __dirname is not defined in ES module scope` at boot                             | Every service `package.json` is `"type": "module"` (since the NestJS 12 upgrade), so `dist/*.js` is ESM and CommonJS globals (`__dirname`, `__filename`, `require`) do not exist. Use `import.meta.dirname` / `import.meta.filename`. Do **not** register `tsconfig-paths` at runtime — aliases are already rewritten by `tsc-alias -f` at build time, and `tsconfig-paths` only hooks CommonJS `require` anyway. chat-service crash-looped the 2026-09-02 prod rollout on exactly this; its ESLint config now bans both globals via `no-restricted-globals`.                                                                                  |

---

## See also

- [docker-guide.md](docker-guide.md) — container lifecycle, `claw.sh`
- [ci-cd-pipeline.md](ci-cd-pipeline.md) — full CI pipeline
- [../04-backend/shared-packages.md](../04-backend/shared-packages.md) — the shared packages
- [port-service-map.md](port-service-map.md) — service ↔ port ↔ database map
