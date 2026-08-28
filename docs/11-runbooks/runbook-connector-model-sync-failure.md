# Runbook — "Sync Models" fails with a 500 while "Test Connection" says success

## When this applies

On **Admin → Connectors**, a connector shows a green **Connection test
successful** toast, and then **Sync Models** fails with:

```json
{ "statusCode": 500, "message": "Internal server error" }
```

on `POST /api/v1/connectors/<id>/sync`.

The two buttons appear to contradict each other. They do not — one of them was
lying. Read the next section before touching the connector's configuration.

## Why the test appeared to pass

`POST /connectors/:id/test` returns **HTTP 200 with the verdict in the body**:

```json
{ "status": "DOWN", "latencyMs": 88, "errorMessage": "Anthropic API returned status 400" }
```

`healthCheck` catches provider failures and reports them as `status: DOWN`; it
never throws. So the HTTP call succeeds even when the connector is broken, and
any client that treats the 200 as the verdict shows a success toast over a
`DOWN` result. `syncModels` on the same connector has no such catch — it
rethrows, and Nest maps that to a generic 500 with no detail.

That asymmetry is the whole illusion: **the same failing provider call is
swallowed by test and fatal to sync.** If the UI ever shows success followed by
a sync 500, distrust the toast, not the sync.

Fixed on the frontend in
[`use-test-connector.ts`](../../apps/claw-frontend/src/hooks/connectors/use-test-connector.ts),
which now branches on `status` — but an older build, or any other caller of the
endpoint, can still show the old behaviour.

## Diagnose in one step

The generic 500 carries nothing, but the service logged the real cause and the
manager **persisted it** before rethrowing:

```bash
docker logs claw-connector-service --since 30m 2>&1 | grep "syncModels: failed"
```

```bash
docker exec claw-pg-connector psql -U claw -d claw_connectors \
 -c "select status, error_message, started_at from model_sync_runs \
     where connector_id='<id>' order by started_at desc limit 3;"
```

Every failed sync writes a `model_sync_runs` row with `status = FAILED` and the
adapter's message in `error_message`. Prefer the table: it survives log rotation
and predates the current container.

## Common causes

| `error_message`                                          | Cause                                                                                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `... status 400: anthropic-workspace-id is required ...` | An Anthropic identity-linked key that does not name a workspace. See "an identity-linked key must name its workspace" below. |
| `Failed to fetch <provider> models: ... status 400`      | Any other malformed **header** — often a bad API version. See "The version header is not a feature flag" below.              |
| `Failed to fetch <provider> models: HTTP 401`            | Wrong, revoked, or wrong-environment API key.                                                                                |
| `Failed to fetch <provider> models: HTTP 404`            | Base URL missing its version segment — see the base-URL table below.                                                         |
| `fetch failed` / `The operation was aborted`             | Egress blocked, or the provider took longer than `DEFAULT_HTTP_TIMEOUT_MS`.                                                  |
| `... returned HTTP <n> with a non-JSON body`             | Usually a wrong base URL: an error page or empty body where JSON was expected. Check the version segment below.              |

### Base URL must include the version segment

Every adapter appends `/models` to the stored base URL. The URL is therefore the
API **root**, version included — leave the field blank to take the adapter's
default rather than typing a shorter one:

| Provider  | Correct base URL                                          |
| --------- | --------------------------------------------------------- |
| Anthropic | `https://api.anthropic.com/v1`                            |
| OpenAI    | `https://api.openai.com/v1`                               |
| Gemini    | `https://generativelanguage.googleapis.com/v1beta/openai` |

`https://api.anthropic.com` (no `/v1`) requests `https://api.anthropic.com/models`
and 404s. Note the frontend placeholder shows the bare host as a _hint_, not a
value to copy.

### Anthropic: an identity-linked key must name its workspace

If `error_message` reads:

```
anthropic-workspace-id is required when authenticating with an identity-linked
API key; send the id of the workspace this request acts in.
```

the key is **identity-linked** (tied to a user rather than scoped to one
workspace). Anthropic rejects every such request — `GET /v1/models` included —
until the request names the workspace it acts in. The key is valid; the request
is incomplete. Two ways out:

1. **Fill in "Workspace ID" on the connector** (the field is shown only for
   Anthropic). Find it in the Anthropic Console under the workspace's settings —
   it appears in the console URL and starts with `wrkspc_`. The adapter then
   sends `anthropic-workspace-id`.
2. **Or issue a workspace-scoped API key** in the Console and paste that
   instead. Such a key carries its own workspace and needs no header — leave the
   field blank.

Tell the two failures apart before you touch the key: a _missing_ header says
"is required", a _wrong_ value says "must be a valid workspace ID". The second
means the mechanism works and only the id is wrong.

A blank `anthropic-workspace-id` is itself a 400, so the adapter omits the
header entirely when the value is unset or whitespace — leave the field empty
rather than typing a placeholder.

### The version header is not a feature flag

`anthropic-version` is a **dated API version**, and Anthropic publishes exactly
one current value: **`2023-06-01`**. It does not track the calendar, and there
is no `2024-06-01` — sending one fails **every** call with HTTP 400, including
`GET /v1/models`, before the request is routed.

This bit production: the header had been "bumped" to `2024-06-01` on the belief
that native PDF `document` content parts required a newer version. They do not —
the `document` block is generally available under `2023-06-01`. **Opt-in
features travel on the separate `anthropic-beta` header and never on this one.**
The value is pinned, with a test that fails if it moves, in
[`anthropic.constants.ts`](../../apps/claw-connector-service/src/modules/connectors/constants/anthropic.constants.ts).

The general rule for any provider: if `Test Connection` and `Sync Models`
disagree, suspect a header the provider rejects outright, not the credentials.

## Recover

1. Fix the cause (header, key, or base URL).
2. `docker restart claw-connector-service` — a constant change is code, so a
   restart is enough; see [feedback: restart, not rebuild](../08-runtime-devops/docker-guide.md).
3. Press **Sync Models** again and confirm a `COMPLETED` row:

```bash
docker exec claw-pg-connector psql -U claw -d claw_connectors \
 -c "select status, models_found, models_added from model_sync_runs \
     where connector_id='<id>' order by started_at desc limit 1;"
```

Models arrive `UNEXPOSED` by design. They reach users only after an
administrator exposes them — a successful sync alone changes nothing
user-visible.

## Related

- [service-guide-connector.md](../04-backend/service-guide-connector.md)
- [runbook-model-pull-failure.md](runbook-model-pull-failure.md) — local Ollama models, not provider connectors
