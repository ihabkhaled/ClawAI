# 15 — Configuration and Environment

## Purpose

Configuration is read once, validated with Zod, and exposed through a typed
`AppConfig` — never scraped from `process.env` at call sites. A new env var is
not "added" until it exists in every place the system expects it, or deployment
breaks with a missing-container error.

## Applies to

Every service's `AppConfig`, the root `.env` / `.env.example`, installers,
Docker compose files, and CI.

## Mandatory rules

1. **Never read `process.env` directly.** All access goes through the
   Zod-validated `AppConfig` provider; a missing/invalid var fails fast at boot.
2. **Single root `.env`.** All services `env_file: .env` from repo root; there is
   one env file for the whole stack (copy from `.env.example`).
3. **A new/changed/removed env var updates ALL of:** `.env.example`, `.env`,
   `scripts/install.sh`, `scripts/install.ps1`, and `docs/06-data/environment-variables.md`.
4. **Infra edits for new service/port/volume/DB/GPU dependency:** all split
   compose files — `docker/docker-compose.{dev,prod}.{databases,services,ollama}.yml`
   plus the per-vendor GPU overlays (`gpu-nvidia|rocm|vulkan × dev|prod`) if GPU
   passthrough is needed.
5. **Docker addressing, not localhost.** Service URLs use container name + canonical
   port (`http://ollama:11434`, `http://chat-service:4002`).
6. **`claw.sh` is the only supported entrypoint** — do not invoke `docker compose -f …`
   directly. The `local-ai` profile gates heavy AI components (default OFF).
7. **Defaults documented.** Every new var has a working dev value and a one-line
   description; flags default to the safe/off setting.

## Prohibited patterns

- `process.env.FOO` anywhere outside the config module.
- Adding a var to `.env.example` but not the installers/compose/docs.
- Adding a DB/service to one compose file but not the others (deploy fails "container not found").
- Storing `http://localhost:<port>` for an inter-service URL.

## Correct pattern

```ts
// read config through AppConfig, never process.env
constructor(private readonly config: AppConfig) {}
const model = this.config.memoryExtractionModel; // Zod-validated at boot
```

## Enforcement

- **ESLint** (`no-restricted-syntax`) — bans `process.env` outside the config module.
- **Knowledge check** — `.ai/manifests/{environment-variables,docker-services,ports}.json`
  are verified by `knowledge:check` for drift.
- **CI job** — test env-var lists must include new vars for affected services.

## Related skills

- [06-docker-toolkit](../skills/06-docker-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Environment Variables", "Docker Compose — claw.sh".

## Definition of done

- [ ] Var validated in `AppConfig`; no direct `process.env` access.
- [ ] `.env.example`, `.env`, both installers, docs updated.
- [ ] All relevant compose files (+ GPU overlays) updated consistently.
- [ ] Inter-service URLs use container name + port.
