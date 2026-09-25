# Skill — add, enable or prove a fetch strategy

Use when research-service keeps failing to read a site, when you add a new
way of fetching (a client, a renderer, a sidecar), or when you turn on one of
the sidecars. Decision: [ADR-121](../docs/13-adr/adr-121-pluggable-fetch-strategy-layer.md) ·
tool survey: [`docs/research/scraping-tools-survey.md`](../docs/research/scraping-tools-survey.md) ·
code: `apps/claw-research-service/src/modules/fetch/`.

## First: is it really blocked, or refused?

Read the `fetch.attempt` / `fetch.failed` lines in research-service's log —
they name every tier tried and the signal each got. If the trail ends in
`AUTH_REQUIRED`, `LEGAL_UNAVAILABLE`, `CAPTCHA` or a `fetch.refused
reason=robots_disallow`, the site said no. Nothing in this skill changes
that, and no new strategy may (rule 50, prohibited list).

## Enable a shipped sidecar (Crawl4AI, FlareSolverr, Firecrawl)

1. Add it to `CLAW_SCRAPER_PROFILES` in `.env` (e.g. `crawl4ai,flaresolverr`).
2. `./scripts/claw.sh up` — creates only the named sidecars, on the isolated
   `claw-scrapers` network. Wait for `docker ps` to show it healthy.
3. Enable it DB-level as an admin:
   `PATCH /api/v1/research/fetch-strategies/CRAWL4AI {"enabled": true}`
   (`GET /api/v1/research/fetch-strategies` lists every tier's state).
4. Prove it: the next fetch that escalates that far logs
   `fetch.served kind=CRAWL4AI …`.

Turning one off is the reverse: `{"enabled": false}` first, then drop it from
the profile list and `claw.sh up`.

## Add a new strategy

1. **Wrap the library** (rule 13) in `src/common/utilities/<name>.utility.ts`.
   A CommonJS package is imported by its default export (rule 13 §6).
2. **Add the enum value** to `FetchStrategyKind` in `prisma/schema.prisma`,
   plus a migration (`ALTER TYPE "FetchStrategyKind" ADD VALUE …`), then
   `npx prisma generate`.
3. **Implement `FetchStrategyAdapter`**: `readonly kind`, `fetchPage(request)`,
   optional `supports(url)`. Rules every adapter follows:
   - HTTP it does itself goes through `followRedirectsSafely` with a client
     that does NOT follow redirects (each hop SSRF-checked before it is sent);
   - HTML ends in `extractPageContent` (one extraction for every tier);
   - it returns the real status and never decides "blocked" — the classifier
     and `escalation-policy.utility.ts` do;
   - a third-party service only receives `assertPublicThirdPartyUrl` URLs;
   - per-call config comes from `request.strategyConfig`, never mutable state.
4. **Register**: `FetchModule` providers, `FetchStrategyRegistryService`
   constructor list, and the three maps in `fetch-strategy.constants.ts`
   (tier, default-enabled, timeout) — plus `STRATEGIES_TOUCHING_ORIGIN` /
   `STRATEGIES_RENDERING_JAVASCRIPT` membership, which the policy reads.
5. **Default disabled** unless the owner decided otherwise. The seeder never
   overwrites a row an admin already edited.
6. **Test** the adapter (mock `fetch`/the wrapper) and add a policy case if its
   eligibility differs from its neighbours.
7. **Gate scoped** in `apps/claw-research-service`: `npm run typecheck`,
   `npm run lint`, `npm test`, `npm run build`.

## Prove it live (rule 44)

Dev containers compile the MAIN checkout's `src`, so a worktree cannot be
proven with `service:rebuild`. Build the prod image from the tree you are
proving and run it beside the stack on the same networks:

```bash
docker build -f apps/claw-research-service/Dockerfile -t claw-research-service:verify .
docker run -d --name claw-research-verify --env-file <path to the stack's .env> \
  -v <certs dir>:/certs:ro --network claw-network claw-research-service:verify
docker network connect claw-scrapers claw-research-verify   # only if sidecars run
```

Then POST `/api/v1/research/fetch` to it with an admin bearer and read
`docker logs claw-research-verify | grep fetch.served`. Useful fixtures (all
checked 2026-09-25): `https://quotes.toscrape.com/js/` (JS-only →
HEADLESS_BROWSER), `https://www.fiverr.com/` (403 to Node's TLS, 200 to impit
→ HTTP_TLS_IMPERSONATE), `https://en.wikipedia.org/w/index.php?title=X`
(robots Disallow → 403 `FETCH_ROBOTS_DISALLOWED`),
`https://en.wikipedia.org/wiki/Web_scraping` (→ OFFICIAL_API).

## Common mistakes

- Letting a client follow redirects itself (`redirect: 'follow'`,
  `followRedirects: true`) — the request to the unsafe hop is already sent.
- Seeding a strategy enabled "to test it" and shipping that.
- Reading `rawHtml`-less results as shells: `EMPTY_JS_SHELL` needs script-driven
  markup; a short static page is fine as it is.
- Adding a Readability/Turndown call of your own instead of `extractPageContent`.
