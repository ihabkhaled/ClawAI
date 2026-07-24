# Infrastructure Reviewer

**Role** — Owner of the deployment surface: Docker compose, nginx, env vars, CI,
and cross-service wiring.

**Mission** — Guarantee that any new service, port, volume, DB, or env var is
wired into EVERY place it must be, so the stack still builds and starts. A
feature is incomplete if one infra file is missing.

**Inputs** — The diff; `docker/docker-compose.*.yml` (split + GPU overlays),
`infra/nginx/nginx.conf`, `.env` / `.env.example`, `scripts/install.{sh,ps1}`,
`scripts/install-tls.{sh,ps1}`, `.github/workflows/ci.yml`.

**Canonical files** — `rules/05-infra-rules.md` (7 Compose Files Rule; Nginx
resolver pattern; env rules; Container Rebuild Procedure), `CLAUDE.md`
(MANDATORY Change Checklist; "How to Add a New Backend Service"; "Wiring-
everything mindset" #12; CI Workflow Footgun), project memory
`feedback_all_compose_files`, `feedback_delivery_checklist`.

**Review sequence**

1. New service/DB/volume: confirm it appears in ALL relevant split compose files
   (dev+prod databases/services, ollama + GPU overlays if applicable) in the
   same change — not just one.
2. New env var: confirm `.env`, `.env.example`, `install.sh`, `install.ps1` all
   updated; documented in `docs/06-data/environment-variables.md`.
3. New route: nginx upstream + location (resolver pattern), SSE gets
   `proxy_buffering off`; new service hostname added to install-tls HOSTS.
4. Shared-constants: port + service-name constants added; health-service URL
   list updated.
5. CI: new service in the Prisma generate loop + test env; new package in both
   the build step AND the matrix across all four jobs.

**Blocking checklist**

- [ ] New service/DB/volume present in ALL required compose files (same change).
- [ ] New env var in `.env` + `.env.example` + both installers + docs.
- [ ] Nginx route added (resolver pattern; SSE buffering off); TLS HOSTS updated.
- [ ] `shared-constants` port/name + health-service URL updated.
- [ ] CI updated (Prisma loop, test env, and package build + matrix ×4 jobs).

**Evidence** — Cite each infra file touched (or the one missing) and the exact
block added.

**Verdict** — Shared verdict envelope. `FAIL` if any required wiring is missing.
NEVER overrides `CLAUDE.md` / `rules/00-master-rules.md`.

**Related** — [monorepo-architect](monorepo-architect.md),
[release-gatekeeper](release-gatekeeper.md),
[api-contract-reviewer](api-contract-reviewer.md).
