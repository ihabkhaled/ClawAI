# 13 — External Library Wrappers and Adapters

## Purpose

Third-party code touches ClawAI in exactly one place. Wrapping every external
library behind a utility, and every external provider behind an adapter, means a
breaking upstream change is a one-file fix and provider quirks never leak into
business logic.

## Applies to

`apps/claw-*/src/common/utilities/*.utility.ts` (library wrappers),
`apps/claw-*/src/**/*.adapter.ts` (provider adapters), and `packages/shared-utilities`.

## Mandatory rules

1. **Wrap every third-party npm package** in `src/common/utilities/<name>.utility.ts`
   (or the shared package). Services/controllers/managers import the wrapper, never
   the package directly from `node_modules`.
2. **One adapter per external provider.** The 7 connector providers (OpenAI,
   Anthropic, Gemini, AWS Bedrock, DeepSeek, Ollama, Grok) and runtime adapters
   (SD WebUI, ComfyUI) each sit behind a `*.adapter.ts` implementing a common
   interface, selected by a factory.
3. **Adapters normalize shapes.** Provider-specific payloads (e.g. Ollama's native
   `images: [base64]` vs cloud `image_url` parts) are translated inside the adapter;
   callers see one normalized contract.
4. **Adapters/wrappers obey the layer rules** — ≤ file/method ceilings, no inline
   declarations, full logging on public methods.
5. **Cross-service wrappers live in `@claw/shared-utilities`**, not copied per
   service (jwt-verifier, http-client, crypto, retry — already shared).
6. **Import a CommonJS package with a DEFAULT import, never `import * as x`.**
   Every workspace is `"type": "module"`, so under real ESM the namespace object
   holds only the named exports `cjs-module-lexer` could statically detect, and
   the actual `module.exports` sits on `.default`. It is per-package, not a
   blanket truth: `argon2` exposes `hash`/`verify` fine, while `jsonwebtoken`
   exposes `decode` alone — so `jwt.verify` was `undefined` and every
   authenticated request in production 401'd on 2026-09-02 with
   `jwt.verify is not a function`. **ts-jest transpiles specs to CommonJS, where
   the namespace import works**, so unit tests pass against a module shape
   production never uses. That is why this rule has a runtime test rather than a
   lint rule.

## Prohibited patterns

- `import OpenAI from 'openai'` inside a service/manager (must go through an adapter/wrapper).
- Provider `if (provider === 'ollama') …` branching scattered across business logic
  instead of encapsulated in the adapter.
- A second copy of a wrapper that already exists in `@claw/shared-utilities`.
- `import * as x from '<commonjs-package>'` in any `"type": "module"` workspace
  where the code then calls `x.someFunction()` — see mandatory rule 6.

## Correct pattern

```
apps/claw-connector-service/src/modules/connectors/adapters/anthropic.adapter.ts
apps/claw-connector-service/src/modules/connectors/adapters/adapter.factory.ts   # selects by provider enum
packages/shared-utilities/src/http-client/…                                       # shared fetch wrapper
```

## Enforcement

- **ESLint** (`import-x`, `no-restricted-syntax`) — flags direct `node_modules`
  imports outside wrapper files.
- **Architecture test** — business layers import wrappers/adapters, not SDKs.
- **Unit test** — adapter normalization covered per provider (mock at the boundary).
- **Root test** — `tools/__tests__/esm-namespace-import-bindings.test.mjs`
  (`npm run knowledge:test`; pre-push and the `ai-native-os` CI job) imports every
  namespace-imported third-party package as real ESM and asserts each member the
  source CALLS exists on the namespace. Call position only, so type-only members
  such as `jwt.JwtPayload` are never flagged. A lint rule could not do this: the
  answer differs per package and is only knowable at runtime.

## Related skills

- [09-refactor-toolkit](../skills/09-refactor-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Library Wrapping Rule", "Adapter factory" references;
  compare-file-attachments adapter chain.

## Definition of done

- [ ] Every new third-party dependency is wrapped in one place.
- [ ] Provider logic is encapsulated in an adapter with a common interface.
- [ ] No duplicate wrapper across services.
- [ ] Wrapper/adapter passes the ceilings + logging rules.
