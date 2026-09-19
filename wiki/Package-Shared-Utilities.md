# Package: @claw/shared-utilities

> **Workspace:** `packages/shared-utilities`

## Purpose and ownership

# @claw/shared-utilities — agent guide

**Type:** shared-package · **Path:** `packages/shared-utilities`

## Canonical owner
- Root policy: `CLAUDE.md` + `rules/00-non-negotiable-rules.md`
- Shared packages: `rules/17-shared-packages.md` + `context/package-boundaries.md`

## Commands (run in this folder only)
```
npm run typecheck
npm run lint
npm run test
npm run build
```

## Dependencies (generated)
- Depends on: @claw/shared-constants, @claw/shared-types

## Before editing
1. `npm run knowledge:context -- --task="<task>" --service=@claw/shared-utilities`
2. Read `.ai/local/current-context.md`.
3. Never cross this workspace's data boundary; never bypass hooks; never suppress lint/types.

_Generated from source. Edit the renderer, not this file._


## Package metadata

- Version: `1.100.1`
- Private: `true`
- Source files in workspace: **113**
- Internal dependencies: `@claw/shared-constants`, `@claw/shared-types`

## Scripts

| Script | Command |
|---|---|
| `typecheck` | `node ../../tools/typescript/run-ts7.mjs --noEmit` |
| `build` | `node ../../tools/typescript/run-ts7.mjs -p tsconfig.build.json && tsc-alias -p tsconfig.build.json -f` |
| `test` | `vitest run --passWithNoTests` |
| `lint` | `eslint src/ --concurrency=1` |
| `lint:fix` | `eslint src/ --fix` |
| `test:watch` | `vitest` |

## Workspace inventory

- [`packages/shared-utilities/AGENTS.md`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/AGENTS.md)
- [`packages/shared-utilities/__tests__/runtime-progress/extract-final-timings.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/__tests__/runtime-progress/extract-final-timings.utility.spec.ts)
- [`packages/shared-utilities/__tests__/runtime-progress/find-bottleneck.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/__tests__/runtime-progress/find-bottleneck.utility.spec.ts)
- [`packages/shared-utilities/__tests__/runtime-progress/parse-ollama-ndjson.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/__tests__/runtime-progress/parse-ollama-ndjson.utility.spec.ts)
- [`packages/shared-utilities/__tests__/runtime-progress/runtime-progress-envelope.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/__tests__/runtime-progress/runtime-progress-envelope.utility.spec.ts)
- [`packages/shared-utilities/__tests__/runtime-progress/think-tag-scanner.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/__tests__/runtime-progress/think-tag-scanner.utility.spec.ts)
- [`packages/shared-utilities/package.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/package.json)
- [`packages/shared-utilities/src/billing-period/__tests__/add-calendar-months.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/billing-period/__tests__/add-calendar-months.utility.spec.ts)
- [`packages/shared-utilities/src/billing-period/add-calendar-months.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/billing-period/add-calendar-months.utility.ts)
- [`packages/shared-utilities/src/billing-period/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/billing-period/index.ts)
- [`packages/shared-utilities/src/effort/__tests__/effort-resolver.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/effort/__tests__/effort-resolver.utility.spec.ts)
- [`packages/shared-utilities/src/effort/effort-profile.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/effort/effort-profile.constants.ts)
- [`packages/shared-utilities/src/effort/effort-resolver.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/effort/effort-resolver.utility.ts)
- [`packages/shared-utilities/src/effort/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/effort/index.ts)
- [`packages/shared-utilities/src/email/__tests__/smtp-email.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/email/__tests__/smtp-email.utility.spec.ts)
- [`packages/shared-utilities/src/email/email.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/email/email.types.ts)
- [`packages/shared-utilities/src/email/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/email/index.ts)
- [`packages/shared-utilities/src/email/smtp-email.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/email/smtp-email.utility.ts)
- [`packages/shared-utilities/src/http-client/__tests__/request-url.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/http-client/__tests__/request-url.utility.spec.ts)
- [`packages/shared-utilities/src/http-client/axios-client.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/http-client/axios-client.utility.ts)
- [`packages/shared-utilities/src/http-client/fetch-client.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/http-client/fetch-client.utility.ts)
- [`packages/shared-utilities/src/http-client/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/http-client/index.ts)
- [`packages/shared-utilities/src/http-client/request-url.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/http-client/request-url.utility.ts)
- [`packages/shared-utilities/src/https-bootstrap/https-bootstrap.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/https-bootstrap/https-bootstrap.types.ts)
- [`packages/shared-utilities/src/https-bootstrap/https-bootstrap.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/https-bootstrap/https-bootstrap.utility.ts)
- [`packages/shared-utilities/src/https-bootstrap/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/https-bootstrap/index.ts)
- [`packages/shared-utilities/src/idempotency/__tests__/idempotency-key.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/idempotency/__tests__/idempotency-key.utility.spec.ts)
- [`packages/shared-utilities/src/idempotency/idempotency-key.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/idempotency/idempotency-key.utility.ts)
- [`packages/shared-utilities/src/idempotency/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/idempotency/index.ts)
- [`packages/shared-utilities/src/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/index.ts)
- [`packages/shared-utilities/src/jwt/__tests__/jwt-verifier.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/jwt/__tests__/jwt-verifier.utility.spec.ts)
- [`packages/shared-utilities/src/jwt/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/jwt/index.ts)
- [`packages/shared-utilities/src/jwt/jwt-verifier.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/jwt/jwt-verifier.utility.ts)
- [`packages/shared-utilities/src/model-context-window/__tests__/model-context-window.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/model-context-window/__tests__/model-context-window.utility.spec.ts)
- [`packages/shared-utilities/src/model-context-window/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/model-context-window/index.ts)
- [`packages/shared-utilities/src/model-context-window/model-context-window.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/model-context-window/model-context-window.constants.ts)
- [`packages/shared-utilities/src/model-context-window/model-context-window.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/model-context-window/model-context-window.types.ts)
- [`packages/shared-utilities/src/model-context-window/model-context-window.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/model-context-window/model-context-window.utility.ts)
- [`packages/shared-utilities/src/money/__tests__/commercial-rounding.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/__tests__/commercial-rounding.utility.spec.ts)
- [`packages/shared-utilities/src/money/__tests__/display-currency.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/__tests__/display-currency.utility.spec.ts)
- [`packages/shared-utilities/src/money/__tests__/fx.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/__tests__/fx.utility.spec.ts)
- [`packages/shared-utilities/src/money/__tests__/localized-money.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/__tests__/localized-money.utility.spec.ts)
- [`packages/shared-utilities/src/money/__tests__/micro-usd.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/__tests__/micro-usd.utility.spec.ts)
- [`packages/shared-utilities/src/money/__tests__/money.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/__tests__/money.utility.spec.ts)
- [`packages/shared-utilities/src/money/__tests__/proration-breakdown.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/__tests__/proration-breakdown.utility.spec.ts)
- [`packages/shared-utilities/src/money/__tests__/proration.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/__tests__/proration.utility.spec.ts)
- [`packages/shared-utilities/src/money/__tests__/refund-settlement.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/__tests__/refund-settlement.utility.spec.ts)
- [`packages/shared-utilities/src/money/commercial-rounding.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/commercial-rounding.utility.ts)
- [`packages/shared-utilities/src/money/display-currency.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/display-currency.utility.ts)
- [`packages/shared-utilities/src/money/fx.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/fx.utility.ts)
- [`packages/shared-utilities/src/money/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/index.ts)
- [`packages/shared-utilities/src/money/localized-money.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/localized-money.utility.ts)
- [`packages/shared-utilities/src/money/micro-usd.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/micro-usd.utility.ts)
- [`packages/shared-utilities/src/money/money-error-code.enum.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/money-error-code.enum.ts)
- [`packages/shared-utilities/src/money/money-error.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/money-error.ts)
- [`packages/shared-utilities/src/money/money.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/money.utility.ts)
- [`packages/shared-utilities/src/money/proration.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/proration.utility.ts)
- [`packages/shared-utilities/src/money/refund-settlement.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/money/refund-settlement.utility.ts)
- [`packages/shared-utilities/src/runtime-progress/__tests__/extract-final-timings.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/runtime-progress/__tests__/extract-final-timings.spec.ts)
- [`packages/shared-utilities/src/runtime-progress/extract-final-timings.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/runtime-progress/extract-final-timings.utility.ts)
- [`packages/shared-utilities/src/runtime-progress/find-bottleneck.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/runtime-progress/find-bottleneck.utility.ts)
- [`packages/shared-utilities/src/runtime-progress/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/runtime-progress/index.ts)
- [`packages/shared-utilities/src/runtime-progress/parse-ollama-ndjson.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/runtime-progress/parse-ollama-ndjson.utility.ts)
- [`packages/shared-utilities/src/runtime-progress/runtime-progress-envelope.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/runtime-progress/runtime-progress-envelope.utility.ts)
- [`packages/shared-utilities/src/runtime-progress/think-tag-scanner.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/runtime-progress/think-tag-scanner.utility.ts)
- [`packages/shared-utilities/src/safe-stringify/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/safe-stringify/index.ts)
- [`packages/shared-utilities/src/safe-stringify/safe-stringify.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/safe-stringify/safe-stringify.spec.ts)
- [`packages/shared-utilities/src/safe-stringify/safe-stringify.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/safe-stringify/safe-stringify.utility.ts)
- [`packages/shared-utilities/src/speed/__tests__/speed-resolver.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/speed/__tests__/speed-resolver.utility.spec.ts)
- [`packages/shared-utilities/src/speed/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/speed/index.ts)
- [`packages/shared-utilities/src/speed/speed-profile.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/speed/speed-profile.constants.ts)
- [`packages/shared-utilities/src/speed/speed-resolver.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/speed/speed-resolver.utility.ts)
- [`packages/shared-utilities/src/token-security/__tests__/token-security.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-security/__tests__/token-security.utility.spec.ts)
- [`packages/shared-utilities/src/token-security/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-security/index.ts)
- [`packages/shared-utilities/src/token-security/token-security.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-security/token-security.utility.ts)
- [`packages/shared-utilities/src/token-usage/__tests__/cached-and-reasoning-tokens.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/__tests__/cached-and-reasoning-tokens.spec.ts)
- [`packages/shared-utilities/src/token-usage/__tests__/estimate-text-tokens.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/__tests__/estimate-text-tokens.spec.ts)
- [`packages/shared-utilities/src/token-usage/__tests__/extract-anthropic-usage.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/__tests__/extract-anthropic-usage.spec.ts)
- [`packages/shared-utilities/src/token-usage/__tests__/extract-bedrock-usage.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/__tests__/extract-bedrock-usage.spec.ts)
- [`packages/shared-utilities/src/token-usage/__tests__/extract-gemini-usage.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/__tests__/extract-gemini-usage.spec.ts)
- [`packages/shared-utilities/src/token-usage/__tests__/extract-llamacpp-usage.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/__tests__/extract-llamacpp-usage.spec.ts)
- [`packages/shared-utilities/src/token-usage/__tests__/extract-ollama-usage.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/__tests__/extract-ollama-usage.spec.ts)
- [`packages/shared-utilities/src/token-usage/__tests__/extract-openai-usage.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/__tests__/extract-openai-usage.spec.ts)
- [`packages/shared-utilities/src/token-usage/__tests__/normalize-token-usage.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/__tests__/normalize-token-usage.spec.ts)
- [`packages/shared-utilities/src/token-usage/__tests__/token-usage-guards.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/__tests__/token-usage-guards.spec.ts)
- [`packages/shared-utilities/src/token-usage/estimate-text-tokens.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/estimate-text-tokens.utility.ts)
- [`packages/shared-utilities/src/token-usage/extract-anthropic-usage.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/extract-anthropic-usage.utility.ts)
- [`packages/shared-utilities/src/token-usage/extract-bedrock-usage.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/extract-bedrock-usage.utility.ts)
- [`packages/shared-utilities/src/token-usage/extract-gemini-usage.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/extract-gemini-usage.utility.ts)
- [`packages/shared-utilities/src/token-usage/extract-llamacpp-usage.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/extract-llamacpp-usage.utility.ts)
- [`packages/shared-utilities/src/token-usage/extract-ollama-usage.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/extract-ollama-usage.utility.ts)
- [`packages/shared-utilities/src/token-usage/extract-openai-usage.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/extract-openai-usage.utility.ts)
- [`packages/shared-utilities/src/token-usage/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/index.ts)
- [`packages/shared-utilities/src/token-usage/normalize-token-usage.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/normalize-token-usage.utility.ts)
- [`packages/shared-utilities/src/token-usage/token-usage-guards.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/token-usage-guards.utility.ts)
- [`packages/shared-utilities/src/token-usage/token-usage.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/token-usage/token-usage.types.ts)
- [`packages/shared-utilities/src/url-detection/__tests__/url-detection.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/url-detection/__tests__/url-detection.utility.spec.ts)
- [`packages/shared-utilities/src/url-detection/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/url-detection/index.ts)
- [`packages/shared-utilities/src/url-detection/url-detection.constants.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/url-detection/url-detection.constants.ts)
- [`packages/shared-utilities/src/url-detection/url-detection.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/url-detection/url-detection.types.ts)
- [`packages/shared-utilities/src/url-detection/url-detection.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/url-detection/url-detection.utility.ts)
- [`packages/shared-utilities/src/vitest-globals.d.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/vitest-globals.d.ts)
- [`packages/shared-utilities/src/weighted-tokens/__tests__/affordability.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/weighted-tokens/__tests__/affordability.spec.ts)
- [`packages/shared-utilities/src/weighted-tokens/__tests__/weighted-tokens.utility.spec.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/weighted-tokens/__tests__/weighted-tokens.utility.spec.ts)
- [`packages/shared-utilities/src/weighted-tokens/affordability.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/weighted-tokens/affordability.types.ts)
- [`packages/shared-utilities/src/weighted-tokens/affordability.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/weighted-tokens/affordability.utility.ts)
- [`packages/shared-utilities/src/weighted-tokens/index.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/weighted-tokens/index.ts)
- [`packages/shared-utilities/src/weighted-tokens/raw-token-breakdown.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/weighted-tokens/raw-token-breakdown.utility.ts)
- [`packages/shared-utilities/src/weighted-tokens/weighted-tokens.types.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/weighted-tokens/weighted-tokens.types.ts)
- [`packages/shared-utilities/src/weighted-tokens/weighted-tokens.utility.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/src/weighted-tokens/weighted-tokens.utility.ts)
- [`packages/shared-utilities/tsconfig.build.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/tsconfig.build.json)
- [`packages/shared-utilities/tsconfig.json`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/tsconfig.json)
- [`packages/shared-utilities/vitest.config.ts`](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/vitest.config.ts)
