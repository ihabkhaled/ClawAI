---
name: add-config-value
summary: Add a Zod-validated AppConfig value and propagate the env var to .env, installers, and docs.
task_keywords:
  [
    env var,
    environment variable,
    appconfig,
    config value,
    zod config,
    process.env,
    .env.example,
    install.sh,
    install.ps1,
    environment-variables doc,
  ]
applies_to: [backend, apps/claw-<service>-service/src/app/config, infra]
required_rules: [02-backend-rules, 05-infra-rules, 06-docs-rules]
required_context: [ai-context-pack]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [config validation spec (valid + missing/invalid)]
required_docs: [docs/06-data/environment-variables.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add a Config Value

Configuration is Zod-validated in `src/app/config/app.config.ts`. Code reads from `AppConfig`, never `process.env`. Adding an env var means updating the schema AND every place the variable is declared.

## When to use

- A new tunable, threshold, feature flag, timeout, URL, or credential reference is needed by a service.

## When NOT to use

- The value is a constant that never changes per environment → put it in `src/common/constants/`.
- The value is a secret being exposed to the frontend → forbidden.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/05-infra-rules.md`](../rules/05-infra-rules.md), [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md) (no `process.env`).
- Existing `src/app/config/app.config.ts` in the target service.

## Repository discovery steps

1. Read the service's `app.config.ts` to see the Zod env schema and the exposed `AppConfig` accessors.
2. Grep the codebase for the nearest analogous variable to copy its default + placement.
3. List all files that declare env vars: `.env`, `.env.example`, `scripts/install.sh`, `scripts/install.ps1`, `docs/06-data/environment-variables.md`.

## Tests-first plan

- Add a config spec: valid value parses; missing required value fails validation; invalid type/range fails.

## Implementation steps

1. Add the field to the Zod env schema in `app.config.ts` (with `.default(...)` or required + coercion for numbers/booleans).
2. Expose a typed accessor on `AppConfig`; consume it via dependency injection — never `process.env` directly.
3. Add the variable with a working dev value to `.env` and a documented example to `.env.example`.
4. Add it to the generated `.env` block in `scripts/install.sh` AND `scripts/install.ps1`.
5. Document it in `docs/06-data/environment-variables.md` (group + default + description).
6. If the value is needed by other services, add it to each service's schema and to the compose files' `env_file`/`environment` as applicable.

## Security considerations

- Never expose secrets to the frontend; only `NEXT_PUBLIC_*` values reach the browser.
- Never log the value if it is a secret; extend Pino redaction rather than bypass it.
- Secrets stay in `.env` (gitignored) — never commit real credentials.

## Failure modes

- Reading `process.env.FOO` directly → banned; breaks the Zod-validated single source of truth.
- Adding to `.env` but not `.env.example`/installers → fresh installs miss the variable and fail at boot.
- Missing docs entry → environment-variables doc drifts.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- `docs/06-data/environment-variables.md`; update root `CLAUDE.md` Environment Variables section if it is a notable new flag.

## Definition of done

- Zod schema + accessor added, all five env-declaration surfaces updated, config spec green, docs updated.
