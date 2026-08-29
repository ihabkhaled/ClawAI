# Runbook — deploying and operating PAYG connector credit

The procedure for shipping the pay-as-you-go credit flagship, verifying it took,
turning it off in a hurry, and knowing the exact moment rollback stops being free.

Design: [`docs/03-architecture/payg-credit.md`](../03-architecture/payg-credit.md) ·
Decisions: [ADR-078](../13-adr/adr-078-payg-connector-credit.md)–[083](../13-adr/adr-083-credit-topup-checkout-purpose.md) ·
Commercial gates: [`docs/business/rollout-and-notice.md`](../business/rollout-and-notice.md)

---

## Read this first: four ways this deploy lies to you

Every one of these has a green log and a wrong outcome. They are the reason this
runbook is longer than "pull and rebuild".

1. **A credit event published before auth is listening is silently discarded, and
   the outbox row is still marked `PUBLISHED`.** The money is taken and no credit
   is granted.
2. **Both docker entrypoints swallow a seed failure.** The log says the seed ran.
   It may have done nothing.
3. **`tools/release/migrate-all.mjs` collects failures instead of aborting.** The
   last line of output is not the result.
4. **nginx bind-mounts single config files, so `nginx -s reload` can serve a
   configuration that no longer exists on disk.** The reload reports success.

---

## 1. Service start order is load-bearing

> **auth-service must be healthy BEFORE payment-service starts.**

`packages/shared-rabbitmq/src/rabbitmq.service.ts:114` publishes like this:

```ts
this.channel.publish(this.exchangeName, pattern, message, {
  persistent: true,
  contentType: 'application/json',
  expiration: String(MESSAGE_TTL_MS),
});
```

There is **no `mandatory` flag**, the exchange is a **topic** exchange, and queues
are asserted by the **consumer** at boot. So a message published to a routing key
that no queue is bound to is **dropped by the broker with no error and no DLQ** —
`mandatory` is exactly the flag that would have returned it as unroutable.

The failure case is specific and expensive: payment-service boots first, drains its
outbox, publishes `billing.credit.topup_succeeded` for a completed purchase, and
auth-service has not yet asserted the queue. The message evaporates. The outbox row
is marked `PUBLISHED`, so nothing will ever retry it. **A customer paid and their
wallet never moved.**

```bash
# 1. auth first, and wait for it to actually be healthy
./scripts/claw.sh up -d auth-service
until [ "$(docker inspect -f '{{.State.Health.Status}}' claw-auth-service)" = healthy ]; do
  sleep 3; docker inspect -f 'auth: {{.State.Health.Status}}' claw-auth-service
done

# 2. prove the queue exists BEFORE payment can publish to it
docker exec claw-rabbitmq rabbitmqctl list_queues name messages consumers \
  | grep -i credit

# 3. only now
./scripts/claw.sh up -d payment-service
```

If step 2 shows no credit queue with at least one consumer, **do not start
payment-service.** Fix auth first.

## 2. auth-service needs a full cycle, not a rebuild

`@nestjs/schedule` is a **new dependency** of auth-service (`package.json`), added
for the reservation sweeper and the grant renewal job.

A layer-cached build serves the **old dependency set** with no build error at all —
`npm ci` is a cached layer, the new import resolves against the old `node_modules`
only if it happens to be hoisted, and what you get is either a boot-time
`Nest can't resolve dependencies of the ScheduleModule` or, worse, a container that
starts and never sweeps.

```bash
./scripts/claw.sh stop auth-service
./scripts/claw.sh rm -f auth-service
docker rmi claw-auth-service          # the step people skip
./scripts/claw.sh up -d --build auth-service
```

**Never skip `docker rmi`.** The same applies to any service in this flagship whose
Prisma schema changed — auth, connector, payment — because a dev container's
`dist/generated/prisma` is **copied, not compiled**, and a stale copy surfaces as
`z.nativeEnum(undefined)` at boot.

| Service                | Why it needs a full cycle                                           |
| ---------------------- | ------------------------------------------------------------------- |
| auth                   | New dependency (`@nestjs/schedule`) **and** a schema change         |
| connector              | Schema change (`is_pay_as_you_go`)                                  |
| payment                | Schema change (three columns + enum + CHECK constraint)             |
| routing                | Code only (`cost-budget/` deleted, seeder added) → `docker restart` |
| chat, image, workspace | Code only → `docker restart`                                        |

Independent services rebuild in parallel; dependents wait.

## 3. Migrations — check the exit code, not the last line

`tools/release/migrate-all.mjs` **collects** failures rather than aborting on the
first one (lines 47–66):

```js
const failed = [];
for (const service of services) {
  try {
    run(service, ['migrate', 'deploy']);
  } catch {
    failed.push(service);
    console.error(`✖ ${service}: migrate deploy failed`);
  }
}
if (failed.length > 0) {
  /* … */ process.exit(1);
}
```

That is deliberate — knowing three services failed beats discovering them one
deploy at a time — but it means **the tail of the output is not the result**. A
successful last service prints a success line above a non-zero exit.

```bash
node tools/release/migrate-all.mjs; echo "EXIT=$?"
# EXIT=0 or the release is aborted. There is no partial pass.
```

Three migrations land in this flagship:

| Migration                                  | Service   | Adds                                                   |
| ------------------------------------------ | --------- | ------------------------------------------------------ |
| `20260829120000_add_payg_credit`           | auth      | 4 tables, 2 enums, 3 `weighted_usage_records` columns  |
| `20260829120100_add_connector_payg_flag`   | connector | `connectors.is_pay_as_you_go` + backfill               |
| `20260829120200_add_credit_topup_checkout` | payment   | Enum rebuild, 3 columns, **3-branch** CHECK constraint |

All three are **additive**. Nothing is dropped, so the schema can stay forward
through a rollback of the images.

## 4. Seeding — a green log is not evidence

Both entrypoints swallow a non-zero seed exit:

```sh
# scripts/docker-entrypoint.prod.sh:37
npx prisma db seed || echo "[entrypoint] seed reported a non-zero exit (continuing)"

# apps/claw-auth-service/docker-entrypoint.dev.sh:17
npx prisma db seed 2>&1 || echo "Seed skipped or already applied"
```

Both then print a cheerful next line and the service boots. **Verification must
read the table.**

### 4a. Plan allowances

```bash
docker exec claw-pg-auth psql -U claw -d claw_auth -tAF'|' -c "
  SELECT slug,
         daily_token_quota,
         weekly_token_quota,
         monthly_token_quota,
         monthly_provider_cost_ceiling_micro_usd
  FROM plans
  ORDER BY monthly_price_minor NULLS FIRST;"
```

Expected — and note that the last two columns must be **identical**, because
1 weighted token is 1 micro-USD ([ADR-078](../13-adr/adr-078-payg-connector-credit.md)):

```
free|50000|150000|300000|300000
starter|150000|600000|1500000|1500000
plus|300000|1200000|3000000|3000000
pro|500000|2000000|5000000|5000000
team|1250000|5000000|12500000|12500000
scale|2500000|10000000|25000000|25000000
unlimited|5000000|20000000|50000000|50000000
```

**If `monthly_token_quota` and the ceiling differ for any row, stop.** The smaller
one binds, and the user will be refused at a number their billing page never
showed them. Authority for the figures:
[`docs/business/plan-allowances.md`](../business/plan-allowances.md).

An operator who has tuned a plan keeps their number — the allowance seeder targets
the **old** value and reports a tuned row as skipped. So a mismatch with the table
above is only a problem if nobody tuned it deliberately.

### 4b. The seed ledger

```bash
docker exec claw-pg-auth psql -U claw -d claw_auth -tAF'|' -c "
  SELECT name, version, status, completed_at, coalesce(last_error,'-')
  FROM seed_executions
  ORDER BY name, version;"
```

Every row must read `COMPLETED`. Watch for:

- `plan-payg-allowance` v1 — the allowance migration for existing installs
- `credit-packages` v1 — the five top-up SKUs
- any row stuck in `RUNNING` (a crashed seed) or carrying a `last_error`

A **missing** row is worse than a failed one: it means the seeder never ran, which
is exactly what the swallowed exit code hides.

### 4c. Credit packages and their ratio

```bash
docker exec claw-pg-auth psql -U claw -d claw_auth -tAF'|' -c "
  SELECT p.slug, v.price_minor, v.credit_micro_usd, v.version, v.is_active
  FROM credit_packages p
  JOIN credit_package_versions v ON v.package_id = p.id
  WHERE v.active_key IS NOT NULL
  ORDER BY p.display_order;"
```

Expected at the seeded 0.60 ratio:

```
credit-5|500|3000000|1|t
credit-10|1000|6000000|1|t
credit-25|2500|15000000|1|t
credit-50|5000|30000000|1|t
credit-100|10000|60000000|1|t
```

### 4d. Model prices — launch-blocking

An unpriced model on a metered provider is **blocked, never free**. An empty price
table therefore refuses every paid request on day one.

```bash
docker exec claw-pg-routing psql -U claw -d claw_routing -tAF'|' -c "
  SELECT provider, count(*) FROM model_cost_versions
  WHERE is_active GROUP BY provider ORDER BY provider;"
```

Expect rows for OpenAI, Anthropic, Gemini, DeepSeek and Grok (16 models seeded).
Zero rows means `ModelCostSeedService` did not run — check
`seed_executions` in `claw_routing` too.

### 4e. Connector classification

```bash
docker exec claw-pg-connector psql -U claw -d claw_connectors -tAF'|' -c "
  SELECT provider, is_enabled, is_pay_as_you_go, count(*)
  FROM connectors GROUP BY 1,2,3 ORDER BY 1;"
```

A provider is metered when **any enabled** connector for it is PAYG.

## 5. nginx — restart the container, never reload

`docker/docker-compose.prod.services.yml:340,343`:

```yaml
- ../infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
- ../infra/nginx/locations.conf:/etc/nginx/claw/locations.conf:ro
```

A **file** bind mount binds the **inode**. `git pull` does not edit these files in
place — it writes a replacement and renames it over the original, producing a new
inode. The running container stays attached to the old, now-unlinked one. So the
host file is correct, `git status` is clean, `nginx -t` passes, `nginx -s reload`
succeeds, **and nginx serves the old configuration**. Production served a
three-week-old `locations.conf` this way once, with every deploy reporting a
healthy reload.

```bash
docker restart claw-nginx           # re-establishes the mounts
docker exec claw-nginx nginx -t
docker exec claw-nginx grep -c 'api/v1/credit' /etc/nginx/claw/locations.conf
```

> **Known gap at time of writing:** `grep -rn "credit" infra/nginx/` returns
> **nothing**. The `/api/v1/credit` location does not exist yet — it lands with
> batch C7. Until it does, the user-facing wallet routes 404 as **HTML** (the
> catch-all `location /` sends them to the frontend), while the internal and admin
> paths work because `/api/v1/admin` already proxies to auth-service. If you see an
> HTML 404 on `/api/v1/credit/me`, that is this, not a broken deploy — see
> [runbook-nginx-stale-config.md](runbook-nginx-stale-config.md) for the diagnosis
> idiom.

## 6. Smoke test before enabling anything

With `payg.credit.enabled` still `false`, everything below must work unchanged:

```bash
# a normal chat still answers, and no ledger rows appear
docker exec claw-pg-auth psql -U claw -d claw_auth -tAc \
  "SELECT count(*) FROM credit_ledger_entries;"     # expect 0

# the wallet endpoint answers for an admin (via /api/v1/admin, already proxied)
curl -sk -H "Authorization: Bearer $TOKEN" \
  https://claw.local/api/v1/admin/credit/wallets/$USER_ID | jq .
```

Then enable, and watch one metered request move the ledger:

```bash
# turn it on (admin endpoint, ADMIN_SYSTEM_VIEW-class surface)
curl -sk -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"value":"true"}' https://claw.local/api/v1/admin/system-settings/payg.credit.enabled

# send one chat through a paid provider, then:
docker exec claw-pg-auth psql -U claw -d claw_auth -tAF'|' -c "
  SELECT kind, amount_micro_usd, surface, provider, model, balance_after_micro_usd
  FROM credit_ledger_entries ORDER BY occurred_at DESC LIMIT 5;"
```

You should see a `RESERVATION` (negative, zero bucket deltas) followed by a
`CONSUMPTION` and a `RESERVATION_RELEASE`. An Ollama chat must produce **no rows at
all**.

### The reconciliation query — run it after any incident

```bash
docker exec claw-pg-auth psql -U claw -d claw_auth -tAF'|' -c "
  SELECT w.user_id,
         w.grant_micro_usd,     COALESCE(SUM(l.grant_delta_micro_usd), 0)     AS grant_sum,
         w.purchased_micro_usd, COALESCE(SUM(l.purchased_delta_micro_usd), 0) AS purchased_sum
  FROM user_credit_wallets w
  LEFT JOIN credit_ledger_entries l ON l.wallet_id = w.id
  GROUP BY w.id
  HAVING w.grant_micro_usd     <> COALESCE(SUM(l.grant_delta_micro_usd), 0)
      OR w.purchased_micro_usd <> COALESCE(SUM(l.purchased_delta_micro_usd), 0);"
```

**Zero rows is the invariant.** Any row means a wallet has drifted from its ledger,
which is a correctness incident: the ledger is the source of truth and the wallet is
a materialized sum of it.

## 7. The sweeper — proving single-flight

The reservation sweeper reclaims holds abandoned by a crashed or killed request
after `PAYG_RESERVATION_TTL_MS` (15 minutes), every
`PAYG_RESERVATION_SWEEP_INTERVAL_MS` (5 minutes). auth-service may run more than one
replica, so it must never double-release a hold.

The proof is an **owner-token lease**: `SET key token NX EX ttl` to acquire, and a
Lua **compare-and-delete** to release, so a job can only ever free the lock it
holds. A plain `DEL` would let a slow run whose lock had already expired delete a
lock a different replica has since acquired, and both would then be inside the
critical section believing they were alone. Copied verbatim from payment-service's
scheduled-job runner — two different lock semantics on one Redis is how a job ends
up double-running in production ([ADR-067](../13-adr/adr-067-owner-token-locks-for-scheduled-jobs.md)).

```bash
# who holds the lease right now, and for how long
docker exec claw-redis redis-cli GET claw:job:credit:reservation-sweep
docker exec claw-redis redis-cli TTL claw:job:credit:reservation-sweep
docker exec claw-redis redis-cli TTL claw:job:credit:grant-renewal
```

A positive TTL with a value means a replica owns it. **Never issue an
unconditional `DEL` while any auth-service replica is live** — that is precisely
the race the owner token exists to prevent.

Prove the release is idempotent by counting: an abandoned hold produces exactly
**one** `RESERVATION_RELEASE` row no matter how many sweep ticks pass over it,
because `markReleased` matches only rows still in state `RESERVED` and returns the
row count the caller gates on.

```bash
docker exec claw-pg-auth psql -U claw -d claw_auth -tAF'|' -c "
  SELECT reservation_id, count(*) FILTER (WHERE kind = 'RESERVATION_RELEASE')
  FROM credit_ledger_entries
  WHERE reservation_id IS NOT NULL
  GROUP BY reservation_id HAVING count(*) FILTER (WHERE kind = 'RESERVATION_RELEASE') > 1;"
```

Zero rows. A double release is a double refund.

Also watch for holds older than the TTL that were never reclaimed — that means the
sweeper is not running (usually: auth-service was rebuilt without `docker rmi` and
`@nestjs/schedule` never loaded):

```bash
docker exec claw-pg-auth psql -U claw -d claw_auth -tAc "
  SELECT count(*) FROM weighted_usage_records
  WHERE state = 'RESERVED' AND is_payg AND created_at < now() - interval '30 minutes';"
```

## 8. The point of no return

> **The first `CreditLedgerEntry` with `kind = 'TOPUP'`.**

```bash
docker exec claw-pg-auth psql -U claw -d claw_auth -tAc \
  "SELECT count(*) FROM credit_ledger_entries WHERE kind = 'TOPUP';"
```

**While that count is 0** — rollback is free:

- flip `payg.credit.enabled` to `false`;
- roll the images back;
- **leave the schema forward.** All three migrations are purely additive, and the
  new columns default to non-PAYG values, so older code runs against the new schema
  unchanged.

**Once that count is ≥ 1** — a user has paid real money for a balance:

- corrections are **compensating ledger entries only**. Never `UPDATE` or `DELETE` a
  ledger row; the ledger is append-only and finance reads it as history.
- **NEVER drop the credit tables.** payment-service still holds `CheckoutSession`
  rows with `purpose = 'CREDIT_TOPUP'` referencing `credit_package_id` and
  `credit_package_version_id` — **as opaque strings with no foreign key**, because
  they name rows in another service's database. There is nothing to stop you, and
  nothing to tell you afterwards what a completed purchase was owed.
- turning the feature off is a **commercial** decision about outstanding balances,
  not an operational one. See
  [`docs/business/rollout-and-notice.md`](../business/rollout-and-notice.md) §"If it
  has to be turned off after stage 5" — and note that decision has **not been
  made**.

## 9. Kill switch — fastest first

| #   | Action                                            | Effect                                                                    | Speed              | Un-takes money? |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------- | ------------------ | --------------- |
| 1   | `SystemSetting` `payg.credit.enabled` → `false`   | Every reservation short-circuits `METERING_DISABLED`. Nothing is metered. | **Immediate**      | No              |
| 2   | `UPDATE connectors SET is_pay_as_you_go = false;` | Nothing classifies as PAYG. Survives an auth restart.                     | ≤ 60 s (cache TTL) | No              |
| 3   | Roll the images back                              | Removes the code path entirely.                                           | Minutes            | **No**          |

```bash
# 1 — the fastest lever
curl -sk -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"value":"false"}' https://claw.local/api/v1/admin/system-settings/payg.credit.enabled

# or straight at the table if the API is the thing that is broken
docker exec claw-pg-auth psql -U claw -d claw_auth -c \
  "UPDATE system_settings SET value = 'false' WHERE key = 'payg.credit.enabled';"

# 2 — belt and braces, survives an auth restart
docker exec claw-pg-connector psql -U claw -d claw_connectors -c \
  "UPDATE connectors SET is_pay_as_you_go = false;"
```

**Use 1 and 2 together in a real incident.** 1 is instant but lives in auth's cache
and its table; 2 removes the classification at the source. 3 is slowest and **does
not un-take money** — it only stops new spend, which 1 already did.

After any kill-switch use, release outstanding holds so users are not left short:
either wait for the sweeper's 15-minute TTL, or check for stuck rows with the query
in §7.

## 10. Symptoms → cause

| Symptom                                                   | Likely cause                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Customer paid, wallet did not move                        | **Boot order.** Credit event published before auth subscribed; outbox says `PUBLISHED`. §1                                      |
| Every paid request refused `PAYG_MODEL_UNPRICED`          | Model price table empty — the seeder did not run. §4d                                                                           |
| Every paid request refused `PAYG_PRICING_UNAVAILABLE`     | routing-service unreachable, or its internal auth header is wrong. Fails closed by design                                       |
| Nothing is metered at all                                 | Kill switch off, or no connector has `is_pay_as_you_go = true`. §4e                                                             |
| A local (Ollama) chat debited credit                      | **Serious.** A PAYG provider resolved through the zero-rate fallback. [ADR-082](../13-adr/adr-082-payg-classification-grain.md) |
| Balance falls but the UI never shows it                   | `/api/v1/credit` not proxied. §5                                                                                                |
| Users refused at half the credit their billing page shows | `monthly_token_quota` ≠ cost ceiling. §4a                                                                                       |
| Wallets drift from their ledgers                          | Run the reconciliation query in §6, then read [ADR-080](../13-adr/adr-080-one-reservation-not-two.md)                           |
| Holds never released, balances shrinking                  | Sweeper not running — auth rebuilt without `docker rmi`, `@nestjs/schedule` absent. §2, §7                                      |
| Answers silently shorter than requested                   | The affordability clamp, working as designed — but the clamp notice is not rendering. AC-4                                      |
| Admin replay spends money against no wallet               | **Known gap U7**, deliberate. `router-shadow-evaluation.manager.ts:138`                                                         |

## Related

- [`docs/03-architecture/payg-credit.md`](../03-architecture/payg-credit.md) — the mechanism
- [`skills/deploy-payg-credit.md`](../../skills/deploy-payg-credit.md) — the pre-flight checklist
- [`skills/meter-a-paid-provider-call.md`](../../skills/meter-a-paid-provider-call.md) — wiring a new surface
- [runbook-nginx-stale-config.md](runbook-nginx-stale-config.md) · [runbook-failed-billing-sweep.md](runbook-failed-billing-sweep.md) · [runbook-billing-reconciliation.md](runbook-billing-reconciliation.md)
- [`docs/business/rollout-and-notice.md`](../business/rollout-and-notice.md) — the commercial gates
- [`rules/37-payg-credit-integrity.md`](../../rules/37-payg-credit-integrity.md)
