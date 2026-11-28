# ADR-232: Verified crawlers by published IP range, smart edge limits, scanner 404s, fail2ban in the repo

Status: Accepted (owner decision, 2026-11-28). Builds on [ADR-222](adr-222-sign-up-abuse-defences-and-internal-surfaces.md)
(edge budgets, fail2ban, internal surfaces), [ADR-147](adr-147-auth-route-rate-limits.md) and
[ADR-230](adr-230-security-rate-limits-fail-closed.md) (per-route limits stay as they are).

Owner order: "smart realistic rate limiting that stops only suspicious or DoS traffic, not legitimate bursts; fail2ban for
attackers; crawlers must be validated well - confirm and prove they are Google or Bing search-engine bots, no fakes;
healthy, good crawlers are welcome; if they abuse they get banned for a period; only needed ports exposed; Redis,
RabbitMQ and the databases never reachable and all password protected."

## Context

- A `User-Agent` header proves nothing: any scanner can say `Googlebot`. Until now nginx treated every client the same, so
  there was no way to welcome a real crawler and refuse an impostor, and the only brakes were per-route zones (sign-in,
  payments, feedback, agent) plus 100 concurrent connections. A flood of `GET` requests to a page or to any other API
  route had no per-address limit at all.
- A cheap probe bought an expensive answer. `/.env`, `/.git/config`, `/docker-compose.yml`, `/package.json` and
  `/swagger.json` fell through to the Next.js catch-all, which rendered a ~470 KB 404 page.
- TLS 1.2 still allowed CBC suites (`HIGH:!aNULL:!MD5`).
- The fail2ban files lived only on the production host, so a rebuilt server lost them, and a verified crawler that
  tripped the scan or flood jail could be banned for days.
- Found on production the same day: the Firecrawl sidecar's Redis answered `PONG` to anyone and its RabbitMQ still had the
  default `guest` user, on `claw-scrapers`, the network shared with crawl4ai, flaresolverr and the headless browsers that
  load untrusted pages.

## Decision

1. **Proof, not claims.** `tools/crawlers/update-verified-crawler-ranges.mjs` downloads the operators' OWN published range
   files and writes `infra/nginx/verified-crawlers/ranges.conf`, an nginx `geo` include of `cidr operator;` lines
   (3,267 prefixes at the time of writing). Sources that were fetched and parsed on 2026-11-28: Google (googlebot,
   special-crawlers, user-triggered-fetchers, user-triggered-fetchers-google), Bing (`bingbot.json`), Apple
   (`applebot.json`), DuckDuckGo (`duckduckbot.json`), OpenAI (gptbot, searchbot, chatgpt-user), Perplexity
   (perplexitybot, perplexity-user), Mistral (`mistralai-user-ips.json`), Common Crawl (`ccbot.json`) and Ahrefs
   (`crawler-ip-ranges`). Not used, and why: Amazonbot publishes its list inside an HTML page, not as a file; Meta, Slack,
   X, LinkedIn and Anthropic publish none; Yandex, Baidu, PetalBot, Seznam and Naver verify only by reverse DNS.
   **A crawler that cannot be proven by a published range is an ordinary visitor and is never refused for its claim.**
2. **A verdict on every request** (`$claw_crawler_verdict`, in the access log): `none` (claims no listed crawler),
   `verified` (claims one and the address is in THAT operator's ranges), `fake` (claims one from anywhere else) and
   `unchecked` (claims one but the source is a private or Docker address, for example an IPv6 visitor behind Docker's
   proxy, which cannot be judged). `fake` gets `403` and is banned for 24 h by fail2ban on the first request.
3. **Verified crawlers are welcome, not unlimited.** They are exempt from the human budget and have their own zone
   (`claw_crawler`, 15 req/s per address, burst 150). Past it they get `429` with `Retry-After: 120`; a crawler that ignores
   the 429 (60 refusals in 10 minutes) is banned for ONE HOUR, with no escalation and not counted by recidive. Search
   traffic matters more than a noisy crawler, and the operator's other addresses are untouched. The scan and flood jails
   ignore a verified crawler's lines: an old URL Google remembers costs a 404, never a week of Googlebot.
4. **Smart limits for everyone else.** Three zones, each request in exactly one: `claw_general` for every dynamic request
   (30 req/s sustained, burst 400 per address), `claw_static` for immutable assets (`/_next/static`, images, fonts: 100
   req/s, burst 1000) and `claw_crawler`. A real page load with its API calls is a few dozen requests and a polling
   client a few per second, so neither is ever refused; a script at hundreds per second is. The per-route zones (auth,
   payments, feedback, agent, client logs) are unchanged, and each of those locations repeats the general and crawler
   budget because a location with its own `limit_req` stops inheriting the server-level ones. A private or Docker source
   address has an empty key and is not counted (it would put every IPv6 visitor in one bucket). Every nginx-made 429 is
   JSON with `Retry-After` and `Cache-Control: no-store`; a service's own 429 (`code: RATE_LIMITED`) is untouched.
5. **Scanner probes get a tiny 404 from nginx** (`$claw_scanner_probe`): dotfiles except `/.well-known/`, path traversal,
   `*.php`/`asp`/`jsp`, WordPress/Actuator/phpMyAdmin/Vite probes, root-level backup, key and config files, and
   `docker-compose*`, `package.json`, lock files, `swagger*`, `openapi.*`. They are still logged, so `claw-nginx-scan`
   bans repeat probers. Files under `/api/` and `/_next/` are data and are never matched.
6. **Slow clients.** `client_header_timeout 15s`, `client_body_timeout 30s` (120 s on uploads), `send_timeout 30s`,
   `keepalive_timeout 30s`, `reset_timedout_connection`, `large_client_header_buffers 4 16k`, 4,096 connections and one
   worker per core. The global 75m body cap is unchanged (chat takes 1 MiB, Threads 8 MiB, generation 16 MiB, files 75 MiB);
   only routes whose services take tiny JSON are capped (login, register, bot-check 64k; `/api/v1/auth` and client logs
   256k, both above what the services accept). Streaming routes keep `proxy_buffering off`.
7. **TLS 1.2 is AEAD only** (ECDHE with AES-GCM or ChaCha20-Poly1305), in `nginx.conf` and the distributed template.
8. **fail2ban lives in `infra/fail2ban/`**: the three production jails and the sshd jail as they were, plus
   `claw-nginx-fakebot`, `claw-nginx-crawler-abuse` and `recidive` (3 bans in a day: 7 days on every port, in `DOCKER-USER`
   and `INPUT`), `bantime.increment` on the web jails and `dbpurgeage = 35d` so the increments are remembered.
9. **Directory mount, nightly refresh.** nginx mounts the ranges as a DIRECTORY in every compose file that runs it
   (`NGINX_CRAWLER_RANGES_DIR`, default the repository baseline). `infra/host/refresh-crawler-ranges.sh` and its systemd
   timer refresh them every night into a host directory outside the checkout (the deploy refuses a dirty tree), run
   `nginx -t`, reload and prove nginx sees the new file. The updater refuses an empty file, a source that lost more than
   half, and any malformed, too-broad or private range, and keeps that source's previous copy.
10. **Firecrawl stores have their own credentials** (`FIRECRAWL_REDIS_PASSWORD`, `FIRECRAWL_RABBITMQ_PASSWORD`, user
    `firecrawl` instead of `guest`), required in production compose, generated by the installers, rotated by
    `scripts/rotate-db-passwords.sh`, and kept off every published port.

## Alternatives rejected

- **Trust the User-Agent, or allow-list by name.** Proves nothing; this is the problem.
- **Reverse-DNS in nginx** (needs Lua or an external resolver per request). The published ranges are the operators' own
  machine-readable proof and cost one hash lookup. Reverse DNS stays the manual check for a crawler flagged by mistake.
- **Ban every crawler that exceeds a limit for days.** Rejected by the owner's order and by SEO: crawl budget is lost
  for the whole ban.
- **One global zone for humans and crawlers.** A crawler fetching a page's resources would spend a person's budget, and
  one rate cannot be both generous for Googlebot and a brake for a script.
- **Cache the 404 page, or answer every unknown path at the edge.** Unknown paths still reach Next.js; only the known probe
  shapes are answered by nginx. Revisit if probes of other shapes show up in the log.
- **Commit the refreshed ranges from the host.** The deploy refuses a dirty working tree.

## Consequences

- A real crawler that moves to a range the file does not list yet is refused (and its address banned for a day) until the
  next refresh: hence a nightly refresh, not weekly. Check Search Console for crawl errors after a deploy.
- Googlebot, Bingbot and the others arriving over **IPv6 through Docker's userland proxy** appear as the bridge gateway
  and are `unchecked`: welcome as ordinary visitors, never refused, but not given the crawler budget. Seeing real
  IPv6 sources needs nginx to listen on IPv6 directly or Docker to preserve source addresses. Because that same
  proxied source carries no rate limit and cannot be banned, **production publishes nginx on IPv4 only**
  (`0.0.0.0:80:80`, `0.0.0.0:443:443`, enforced by `prod-compose-internal-ports-loopback.test.mjs`): the domain has no
  AAAA record, so no real visitor uses IPv6 (2026-11-28: 32 of 3,217 requests in 6 h came through the IPv6 proxy).
  Adding an AAAA record means first making Docker preserve IPv6 source addresses.
- Behind a CDN or Cloudflare the client address changes: nginx must restore the real address (realip) BEFORE the verdict is
  computed, or every request looks private and no crawler is judged.
- `claw_general` is per address: a very large office or campus behind one NAT can reach 30 req/s sustained; the numbers
  are one block in `nginx.conf` (and the template). The flood jail (40 refusals in 5 minutes) would then ban the NAT for
  an hour, so watch `limiting requests` and the jail after a deploy.
- The refusal log lines are at `warn`, not `error`; real nginx errors are no longer buried in them.
- The first deploy needs one nginx recreate (a new mount); the host steps are in
  [runbook-production-host-hardening](../11-runbooks/runbook-production-host-hardening.md) sections 3, 7 and 8.

## What would make this stale

A new crawler operator that publishes ranges (add a source and a User-Agent pattern; the tests list both), a move behind a
CDN, an AAAA record or nginx listening on IPv6, a change to the flood or scan jail thresholds, or a change of the numbers in the policy block.
