---
name: deploy-payg-credit
summary: Pre-flight checks and the order of operations for shipping, verifying, or killing PAYG connector credit. Points at the runbook for the full procedure.
task_keywords:
  [
    deploy payg,
    payg credit deploy,
    credit rollout,
    enable payg,
    kill switch,
    payg.credit.enabled,
    credit migration,
    credit seeder,
    plan allowance seed,
    credit rollback,
    topup rollback,
    boot order,
    auth before payment,
  ]
applies_to:
  [
    infra,
    docker,
    apps/claw-auth-service,
    apps/claw-payment-service,
    apps/claw-connector-service,
    apps/claw-routing-service,
  ]
required_rules: [37-payg-credit-integrity, 05-infra-rules, 34-gate-economy-and-machine-resources]
required_context: [payg-credit, environment-ownership-map, database-ownership-map]
affected_workspaces:
  [
    apps/claw-auth-service,
    apps/claw-payment-service,
    apps/claw-connector-service,
    apps/claw-routing-service,
    infra/nginx,
    docker,
  ]
required_tests:
  [seed verification by table read, ledger reconciliation query, sweeper single-flight]
required_docs: [docs/11-runbooks/runbook-payg-credit.md, docs/business/rollout-and-notice.md]
validation_lane: node tools/release/migrate-all.mjs; echo "EXIT=$?" — then the verification queries in the runbook
---

# Skill: Deploy PAYG Credit

**The procedure is [`../docs/11-runbooks/runbook-payg-credit.md`](../docs/11-runbooks/runbook-payg-credit.md).**
This page is the pre-flight: what to confirm before you start, and the four things
about this deploy that report success while failing.

## When to use

- Shipping any batch of the PAYG credit flagship to a real environment.
- Enabling `payg.credit.enabled` for the first time, or for a wider audience.
- Turning metering off in an incident.
- Diagnosing "the customer paid and their wallet did not move".

## When NOT to use

- A code-only change to a service that already meters → ordinary
  [`06-docker-toolkit.md`](06-docker-toolkit.md) restart.
- Adding a new metered surface → [`meter-a-paid-provider-call.md`](meter-a-paid-provider-call.md).
- A billing job that is stuck → [`../docs/11-runbooks/runbook-failed-billing-sweep.md`](../docs/11-runbooks/runbook-failed-billing-sweep.md).

## Read first

- [`../docs/11-runbooks/runbook-payg-credit.md`](../docs/11-runbooks/runbook-payg-credit.md) — the full procedure. Read it end to end before starting, not while starting.
- [`../docs/business/rollout-and-notice.md`](../docs/business/rollout-and-notice.md) — the **commercial** gates. Stage 5 (top-up purchase) is blocked on counsel sign-off that does not exist yet.
- [`../rules/37-payg-credit-integrity.md`](../rules/37-payg-credit-integrity.md).
- [ADR-078](../docs/13-adr/adr-078-payg-connector-credit.md) — what the allowance now means.

## The four things that lie to you

Memorise these. Each has a green log and a wrong outcome.

1. **A credit event published before auth is listening is silently discarded** —
   no `mandatory` flag, topic exchange, consumer-asserted queues — **and the outbox
   row is still marked `PUBLISHED`.** Money taken, no credit granted.
   ⇒ **auth-service healthy BEFORE payment-service starts.**
2. **Both docker entrypoints swallow a seed failure.** `|| echo "…continuing"`.
   ⇒ **Verify by reading the table, never by reading the log.**
3. **`migrate-all.mjs` collects failures instead of aborting.** A success line can
   sit above a non-zero exit. ⇒ **Check `$?`.**
4. **nginx bind-mounts single config files, so a reload can serve a config that no
   longer exists on disk.** ⇒ **`docker restart claw-nginx`, never `nginx -s reload`.**

## Repository discovery steps

1. `git log --oneline origin/main..HEAD` — nothing unpushed.
2. Confirm which of the three migrations are new to the target environment:
   `20260829120000_add_payg_credit` (auth),
   `20260829120100_add_connector_payg_flag` (connector),
   `20260829120200_add_credit_topup_checkout` (payment). All three are **additive**.
3. `git diff --stat <last-deployed>..HEAD -- '*/package.json'` — a new dependency
   means a **full image cycle**, not a rebuild. auth-service gained
   `@nestjs/schedule` in this flagship.
4. `grep -rn "credit" infra/nginx/` — is `/api/v1/credit` proxied yet? At time of
   writing it is **not**; that lands with batch C7.

## Pre-flight checklist

- [ ] Scoped gates green on every touched workspace, once, at the end
      ([rule 34](../rules/34-gate-economy-and-machine-resources.md)).
- [ ] `payg.credit.enabled` will be **`false`** on arrival. The feature ships dark.
- [ ] A database backup exists — the payment and auth schemas both change.
- [ ] The rebuild list is right:

  | Service                | Action                      | Because                              |
  | ---------------------- | --------------------------- | ------------------------------------ |
  | auth                   | stop → rm → **rmi** → build | new dependency **and** schema change |
  | connector              | stop → rm → rmi → build     | schema change                        |
  | payment                | stop → rm → rmi → build     | schema change                        |
  | routing                | `docker restart`            | code only                            |
  | chat, image, workspace | `docker restart`            | code only                            |
  | nginx                  | `docker restart`            | never `reload`                       |

- [ ] You know the boot order: **auth healthy → verify the queue exists → payment**.
- [ ] You have the verification queries open (runbook §4, §6, §7).
- [ ] You know the point of no return: the first
      `credit_ledger_entries` row with `kind = 'TOPUP'`.

## Tests-first plan

Verification here is a set of **queries**, not unit tests, because the failure
modes are operational. Before declaring the deploy done, all of these must hold:

| Query                                           | Expected              | Runbook |
| ----------------------------------------------- | --------------------- | ------- |
| `plans` — monthly quota vs cost ceiling         | identical, all rows   | §4a     |
| `seed_executions`                               | every row `COMPLETED` | §4b     |
| `credit_package_versions` at `active_key`       | 5 rows at 0.60        | §4c     |
| `model_cost_versions` grouped by provider       | non-empty             | §4d     |
| wallet-to-ledger reconciliation                 | **zero rows**         | §6      |
| duplicate `RESERVATION_RELEASE` per reservation | **zero rows**         | §7      |
| PAYG holds older than 30 minutes                | 0                     | §7      |

## Implementation steps

Follow the runbook in order. The short form:

1. Migrate — `node tools/release/migrate-all.mjs; echo "EXIT=$?"` → must be 0.
2. Full-cycle auth, connector, payment; restart the rest.
3. **auth healthy first**, confirm the credit queue has a consumer, then payment.
4. `docker restart claw-nginx`, then verify the config **inside** the container.
5. Verify the seeds by **reading the tables** (§4a–§4e).
6. Smoke test with the flag still off — zero ledger rows.
7. Enable, send one metered request, confirm `RESERVATION` → `CONSUMPTION`.
8. Run the reconciliation query.

## Security considerations

- The kill switch is an admin endpoint behind a permission. Do not expose the
  `SystemSetting` write path to anything else.
- `ADMIN_CREDIT_MANAGE` is deliberately **separate from `ADMIN_PLANS_MANAGE`** so a
  plan editor cannot mint balance. Do not merge them for convenience.
- Never paste a wallet balance next to a user id into a ticket or a chat.
- The internal credit endpoints must never be routed by nginx. Only `/credit`,
  `/admin/credit` and the payment top-up route are public-facing.

## Failure modes

Full symptom table in the runbook §10. The three that cost the most:

| Symptom                            | Cause                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Customer paid, wallet did not move | **Boot order.** The event was discarded; the outbox says `PUBLISHED`.  |
| Every paid request refused         | Model price table empty — the seeder did not run. Unpriced is blocked. |
| Holds never released               | Sweeper not running — auth rebuilt without `docker rmi`.               |

## Validation commands

```bash
node tools/release/migrate-all.mjs; echo "EXIT=$?"

until [ "$(docker inspect -f '{{.State.Health.Status}}' claw-auth-service)" = healthy ]; do sleep 3; done
docker exec claw-rabbitmq rabbitmqctl list_queues name messages consumers | grep -i credit

docker restart claw-nginx && docker exec claw-nginx nginx -t

docker exec claw-pg-auth psql -U claw -d claw_auth -tAF'|' -c \
  "SELECT slug, monthly_token_quota, monthly_provider_cost_ceiling_micro_usd FROM plans ORDER BY slug;"
docker exec claw-pg-auth psql -U claw -d claw_auth -tAF'|' -c \
  "SELECT name, version, status FROM seed_executions ORDER BY name;"
docker exec claw-pg-auth psql -U claw -d claw_auth -tAc \
  "SELECT count(*) FROM credit_ledger_entries WHERE kind = 'TOPUP';"   -- the point of no return
```

## Documentation updates

- Record the deploy outcome and anything surprising in
  `docs/11-runbooks/runbook-payg-credit.md` — a trap that cost time goes in the
  runbook the moment it is understood ([rule 33](../rules/33-knowledge-compounding-and-context-velocity.md) #9).
- If an allowance figure changed, `docs/business/plan-allowances.md` is the
  authority and must move with it.
- If the rollout stage advanced, tick it in `docs/business/rollout-and-notice.md`.

## Definition of done

- [ ] `migrate-all` exited 0.
- [ ] auth was healthy and its credit queue had a consumer **before** payment started.
- [ ] Every seed verified by reading a table, not a log.
- [ ] nginx restarted (not reloaded) and the config verified inside the container.
- [ ] The reconciliation query returned zero rows.
- [ ] The sweeper is running — no PAYG hold older than 30 minutes.
- [ ] You know the current `TOPUP` count, and therefore whether rollback is still free.
- [ ] The commercial gates in `rollout-and-notice.md` were met for the stage you enabled.
