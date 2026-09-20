# Run the coding-agent release rounds

Proving a ClawAI Coding Agent release actually codes, against a live stack.
Enforces [`rules/53-coding-agent-release-rounds.md`](../rules/53-coding-agent-release-rounds.md).

## When

After every coding-agent release, and before claiming any coding-agent feature
is delivered.

## 1. The stack has to be real, and it is usually the stack that is broken

```bash
docker ps --format "{{.Names}}\t{{.Status}}" | head -20
curl -sk -o /dev/null -w "%{http_code}\n" https://claw.local/api/v1/health
```

A `502` on an API path means a service is up but not serving. Read its log:

```bash
docker logs --tail 30 claw-<service>
```

**The failure you will hit most often** is a service that cannot compile because
another workspace added a symbol to a `@claw/shared-*` package. Dev containers
carry a **baked copy** of `packages/*/dist`, so the container compiles against
yesterday's package and reports `has no exported member` or
`does not provide an export named`. Repair without touching anyone's source:

```bash
for p in shared-constants shared-auth shared-types shared-utilities shared-entitlements shared-rabbitmq; do
  (cd packages/$p && npm run build)
done
for c in $(docker ps --format '{{.Names}}' | grep '^claw-' | grep -vE 'pg-|mongodb|rabbitmq|redis|nginx|log-shipper|frontend|clamav|comfyui'); do
  for p in shared-constants shared-auth shared-types shared-utilities shared-entitlements shared-rabbitmq; do
    docker exec "$c" sh -c "[ -d /app/packages/$p/dist ]" && docker cp packages/$p/dist/. "$c":/app/packages/$p/dist/
  done
done
docker restart claw-<service>
```

`docker exec <c> test -d …` silently fails — `test` is not a binary in these
images. Use `sh -c '[ -d … ]'`.

## 2. Find the models that can actually be tested

The connector catalogue is `/connectors/available-models`, **not** `/models`
(that path is the connector service's, and 404s for a catalogue query).

```bash
T=$(curl -sk -X POST https://claw.local/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@claw.local","password":"ClawAdmin123!"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['tokens']['accessToken'])")
curl -sk "https://claw.local/api/v1/connectors/available-models" -H "Authorization: Bearer $T" \
  | python -c "
import sys,json
rows=json.load(sys.stdin)
rows=rows if isinstance(rows,list) else rows.get('data',[])
for m in rows:
    if 'OLLAMA' in str(m.get('provider','')).upper() and m.get('supportsTools'):
        print(m['modelKey'])
"
```

Only `supportsTools` models can run a round. A model without tools will answer
politely and touch nothing, which looks like an agent defect and is not one.

## 3. Run the rounds

```bash
cd apps/claw-coding-agent
NODE_OPTIONS=--use-system-ca \
CLAW_LIVE_EMAIL=admin@claw.local CLAW_LIVE_PASSWORD='ClawAdmin123!' \
node scripts/live-rounds.mjs --models=kimi-k3,glm-5.2,... --repeat=3 --json=rounds.json
```

`NODE_OPTIONS=--use-system-ca` is required: `claw.local` uses a locally trusted
certificate, and Node fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` without it.

Flags: `--models=`, `--scenarios=`, `--repeat=`, `--json=`.

## 4. Triage what fails

| Symptom                        | What it means                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `0 tools` and a fluent answer  | the model replied instead of acting — record the rate, retry before blaming the product |
| tool calls, empty workspace    | a real product defect: the run reported success and delivered nothing                   |
| `run.failed` on one model only | a model limitation; keep the round and record which model                               |
| every model fails one scenario | the prompt or the tool contract, not the models                                         |

Re-run a single failing pair before concluding anything:

```bash
node scripts/live-rounds.mjs --models=kimi-k3 --scenarios=apply-markdown-plan --repeat=5
```

An intermittent failure is a finding in its own right. Record the rate; never
let a green retry erase it.

## 5. Never do this

Never relax an assertion to make a round pass, and never grade a round by the
run's own report. The assertion reads the workspace — that is the only thing
that separates a coding agent from a chat window.
