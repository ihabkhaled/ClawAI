# Cloud Smart Router — evidence log

Real-run evidence, as required by the pack. Command output, not assertions.

---

## 1. Migration applied to a populated database

`claw_routing` (dev), which already held 6,007 routing decisions.

```
$ npx prisma migrate status
18 migrations found in prisma/migrations
Following migrations have not yet been applied:
  20260814073945_add_model_deployment_and_capability_evidence
  20260814082552_add_seed_execution_ledger
  20260814143231_add_router_configuration_and_chain

$ npx prisma migrate deploy
All migrations have been successfully applied.
```

Post-conditions:

| Check                   | Result                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `_prisma_migrations`    | 18                                                                                                             |
| New tables present      | `capability_evidence`, `model_deployments`, `router_chain_entries`, `router_configurations`, `seed_executions` |
| `routing_decisions`     | **6007 — unchanged, no data loss**                                                                             |
| `router_model_registry` | 0                                                                                                              |

That last row is not a defect in this work; it confirms the audit finding that a
deployment boots with an **empty registry** because routing-service's three seed
scripts have no ledger and no automated execution path. It is the reason the
deployment backfill exists.

---

## 2. Seeds run on boot, against the real database

Service booted from the worktree build against `claw_routing`:

```
[RouterChainSeedRepository] applyOnce: cloud-smart-router-default-v1 v1
[RouterChainSeedRepository] applyOnce: seeded cloud-smart-router-default-v1 with 7 chain entries (disabled)
[RouterChainSeedService]    seed: outcome=APPLIED
[DeploymentSeedRepository]  findDefinitionsForBackfill: loaded 0 definitions
[DeploymentSeedService]     backfill: registry is empty - nothing to seed
[NestApplication]           Nest application successfully started
```

Both seeds behaved as designed: the chain applied, and the backfill correctly
declined an empty registry rather than writing nothing quietly.

### Resulting state

```
config: rev=1 status=PUBLISHED enabled=false mode=CLOUD_FIRST

order | provider     | alias                 | role                    | deployment | billing
    1 | GEMINI       | gemini-3.5-flash-lite | PRIMARY                 | NULL       | TOKEN
    2 | GEMINI       | gemini-2.5-flash-lite | MODEL_FALLBACK          | NULL       | TOKEN
    3 | OLLAMA_CLOUD | glm-4.7:cloud         | PROVIDER_FALLBACK       | NULL       | SUBSCRIPTION
    4 | OLLAMA_CLOUD | minimax-m2.1:cloud    | PROVIDER_MODEL_FALLBACK | NULL       | SUBSCRIPTION
    5 | OLLAMA_CLOUD | qwen3.5:cloud         | PROVIDER_MODEL_FALLBACK | NULL       | SUBSCRIPTION
    6 | OLLAMA_CLOUD | gpt-oss:120b-cloud    | LAST_RESORT             | NULL       | SUBSCRIPTION
    7 | GEMINI       | gemini-3.6-flash      | QUALITY_ESCALATION      | NULL       | TOKEN

seed_executions: cloud-smart-router-default-v1 v1 COMPLETED
```

Two properties are visible here and both are intentional:

- **`enabled=false`.** The revision is `PUBLISHED` so it is unambiguously the
  live one, but inert. Seeding a chain is not switching production onto it.
- **Every `deployment` is NULL.** Each alias is a bootstrap guess awaiting
  discovery. `CloudRouterManager` therefore returns
  `NO_RUNNABLE_CHAIN_ENTRY` with per-entry `DEPLOYMENT_UNRESOLVED` reasons —
  the honest answer, rather than guessing an endpoint.

---

## 3. Replay is a no-op

Second boot, same database:

```
[RouterChainSeedService] seed: outcome=ALREADY_APPLIED
```

| Check                   | Before | After |
| ----------------------- | ------ | ----- |
| `router_configurations` | 1      | 1     |
| `router_chain_entries`  | 7      | 7     |

Satisfies the pack's "seed transactional / idempotent / versioned; second run is
a no-op".

---

## 4. Migration safety, verified before touching the dev database

Every migration was authored and proven on throwaway Postgres containers first:

- **Non-destructive:** 0 `DROP` / `TRUNCATE` / `DELETE` / `ALTER COLUMN` /
  `RENAME` across all three migrations; every `ALTER TABLE` targets only a table
  the same migration created.
- **Clean replay:** all 18 migrations apply from empty.
- **Production-like:** the live schema (1,299 lines) plus its 15-row migration
  history was cloned into a scratch container and `migrate deploy` applied only
  the new migrations.
- **Constraints proven in SQL**, not merely declared:
  - duplicate `deployment_key` rejected;
  - deleting a definition cascades away its deployments and their evidence;
  - one `glm-5.2` definition holding a `LOCAL`/`LOCAL_ONLY` and an
    `OLLAMA_CLOUD`/`SUBSCRIPTION` endpoint simultaneously;
  - at most one `PUBLISHED` revision per scope (`DRAFT` and `SUPERSEDED`
    unaffected);
  - unique `(scope, revision)` and unique `(configurationId, order)`.

---

## 5. Still unproven

Stated plainly so it is not mistaken for coverage:

- **No live provider call has been made.** Every adapter test uses mocked HTTP.
  The first real Gemini and Ollama Cloud requests are untested, and the pack's
  bounded live smoke under `ROUTER_LIVE_TEST_BUDGET_USD` has not been run.
- **Nothing is on the v1 hot path.** `CloudRouterManager` is registered and
  reachable, but the live `message.created` path still uses the legacy
  keyword/heuristic router.
- **Discovery does not exist**, so no chain alias can resolve and the chain
  cannot run even if enabled.

---

## 6. Live provider smoke test — Gemini

Run from inside the docker network, through the real credential path, against
the deployment discovery resolved for chain entry 1.

### Credential resolution

```
GET https://connector-service:4003/api/v1/internal/connectors/config?provider=GEMINI
-> 200 | baseUrl: https://generativelanguage.googleapis.com/v1beta/openai | key present (53 chars)
```

Worth recording: internal service URLs are **https**, not http. `AppConfig`
supplies this, so the adapters were already correct, but anything hand-rolling
`http://` against a sibling service will fail.

### A real bug the mocks could not catch

First live call:

```
HTTP 400 | 199ms
{"error":{"code":400,"message":"Invalid value at 'reasoning_effort' (TYPE_STRING), 0",
 "status":"INVALID_ARGUMENT"}}
```

`GeminiRouterAdapter` sent `reasoning_effort: 0` — a number. Gemini requires a
string. **Every live Gemini call would have failed**, while all 31 adapter unit
tests passed, because a mocked `httpRequest` accepts any payload and never
validates it.

Fixed to `'minimal'`, and a regression test now asserts the _type_ of the field
rather than only its presence.

### Working call

```
model: gemini-3.5-flash-lite   effort=minimal   716ms   HTTP 200

{
  "deploymentId": "dep_sonnet",
  "workflow": "coding",
  "confidence": 0.99,
  "reasonCodes": ["CODE_REFACTOR", "TYPESCRIPT_SUPPORT"]
}
```

Prompt asked it to choose between `dep_sonnet` (coding) and `dep_flash` (chat)
for "refactor this TypeScript function". It chose the coding model, returned
strict JSON matching `routerDecisionSchema`, and named a deployment from the
eligible set.

`'low'` (859ms) and `'minimal'` (716ms) are both accepted.

### What this proves

- the credential path works end to end;
- the OpenAI-compatible surface and `response_format: json_object` produce
  schema-valid output;
- the router returns a usable decision in well under the 1,600ms budget
  configured for entry 1.

### What it does not prove

One call, one model, one prompt. No fallback path, no Ollama Cloud call (its
three drifted aliases are still unresolved), and no budgeted multi-case run.
