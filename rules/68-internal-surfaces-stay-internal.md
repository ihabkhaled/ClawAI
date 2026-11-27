# Rule 68 — Internal surfaces stay internal, and the network is not the lock

**Status:** STRICT. Security incident 2026-11-27 ([report](../docs/security/incident-2026-11-27-open-ports-and-signup-farm.md),
[ADR-222](../docs/13-adr/adr-222-sign-up-abuse-defences-and-internal-surfaces.md)).

Every production Postgres, Redis (with no password), MongoDB, RabbitMQ, ClamAV and the frontend were reachable from the
internet: Docker publishes on `0.0.0.0` and inserts its own iptables rules, so a host firewall (ufw, `INPUT`) does not
cover containers. An attacker planted an SSH key through the open Redis. Separately, internal service routes were
`@Public()` with no credential, "protected" only by nginx not routing them.

1. **Only nginx 80/443 face the internet.** Every other published port in a production compose file binds to
   `127.0.0.1` (or `[::1]`). Services reach each other by name on `claw-network`; a host mapping exists for a local tool.
2. **The host enforces it too.** On a production host, `DOCKER-USER` drops internal ports on the public interface
   (`claw-docker-firewall.service`, [runbook](../docs/11-runbooks/runbook-production-host-hardening.md)). A new public
   port goes through nginx, never through a new published port.
3. **Every data store needs a credential**, even when it is unreachable: Redis runs with `requirepass`
   (`REDIS_PASSWORD`, carried in `REDIS_URL`), like Postgres, MongoDB and RabbitMQ.
4. **An internal route proves who is calling.** A controller under `internal/...` (or `*-internal.controller.ts`) has a
   class-level `@UseGuards(ServiceTokenGuard)`; `@Public()` only lifts the user JWT. Every caller sends
   `Authorization: Service <INTER_SERVICE_AUTH_TOKEN>`. A user id in an internal request body is trusted only after that.
5. **SSH takes keys only**, for the named deploy accounts, behind fail2ban.

Mechanism:

- `tools/__tests__/prod-compose-internal-ports-loopback.test.mjs` (`npm run knowledge:test`, CI `ai-native-os`) fails on any
  production port published beyond loopback other than 80/443, and on a Redis without `--requirepass`.
- `tools/__tests__/internal-controllers-guarded.test.mjs` fails on any internal controller without a class-level
  `ServiceTokenGuard` (explicit, commented allow-list only).
- The runbook's outside-in port probe after any infrastructure change.
