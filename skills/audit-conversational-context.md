# Skill: audit conversational context against a live deployment

Use when someone reports that ClawAI forgets earlier parts of a conversation,
before or after a change to the context path, or as a regression gate on
`ContextComposerManager`.

The lab lives in [`scripts/qa-lab/`](../scripts/qa-lab/). It talks to a running
deployment over the public API — it is not a unit test and it does not need the
repo to be running locally.

## Absolute rule: free models only

`client.mjs` sets `ALLOW_METERED = false` and `assertFree()` throws on any
provider outside `OLLAMA` / `LLAMACPP` — the `PAYG_EXEMPT_PROVIDERS` set.
This is enforced **in code**, not by naming convention: never infer cost from a
model name. Every thread is created with `routingMode: 'MANUAL_MODEL'` so the
router cannot substitute a metered model.

If you need metered models for a specific lab, change it deliberately and say so
in the run label. Do not flip it to "just try something".

## Setup

```bash
cd scripts/qa-lab
# credentials are in client.mjs; point BASE at the deployment under test
```

## The decisive experiment — run this first

```bash
node paraphrase-experiment.mjs
```

Plants one fact, adds eight unrelated filler turns, then asks for the fact four
ways: high lexical overlap, low overlap, natural paraphrase, and pure
coreference. It prints the **static prediction** from the selector's own
arithmetic beside the **measured** recall.

Read it like this:

- **All four phrasings recall the fact** → the context path is healthy.
- **Recall varies by phrasing** → a relevance gate has been reintroduced. That
  is the exact defect [ADR-086](../docs/13-adr/adr-086-conversational-context-composer.md)
  removed. On 2026-08-30 this measured 83% / 0% / 0% / 0% across six models.

Cost: 24 threads × 10 turns ≈ 240 free generations, ~15 minutes at 6 workers.

## Verifying a fix, not just finding one

```bash
export QA_LAB_BASE=https://claw.local/api/v1
export NODE_EXTRA_CA_CERTS=./certs/rootCA.pem   # local self-signed CA; never disable TLS checking
node verify-fix.mjs                              # the paraphrase matrix, before vs after
node verify-fix.mjs --only positional_reference  # one phrasing
node run-lab.mjs --label AFTER --suite gauntlet --models 6 --workers 5
node cross-thread-experiment.mjs                 # the privacy + capability pair
```

`--suite gauntlet` is the before/after suite: the 60-turn scenario per model
plus the two model-switch variants and topic-return, and nothing else. A few
hundred generations instead of a few thousand.

**Score on the manifest, not on the model's words.** `verify-fix.mjs` and
`cross-thread-experiment.mjs` both read the receipt's `conversation` block, so a
model that was handed a fact and declined to use it is reported as a model
result rather than a context failure. An early version of the cross-thread
experiment scored the answer text and called a hallucination a privacy leak.

**Give every planted identifier a per-run suffix.** A fixed decoy name fails on
the second run for a correct reason: the first run's own thread now contains it,
and retrieval finds it. The experiment was polluting itself and reporting the
pollution as a bug.

## Breadth and depth

```bash
# every free model, one cheap recall probe each (~10 min)
node run-lab.mjs --label BREADTH --suite breadth --workers 6

# the full gauntlet: 60-turn threads, model switching, topic return, cross-thread
node run-lab.mjs --label BASELINE --suite full --workers 6
```

`--suite full` adds: the gauntlet per headline model, a thread that rotates
model every 10 turns, a thread that rotates every turn, a `maxTokens: 32000`
variant, topic-return threads, and a cross-thread pair.

Results stream to `results/<RUN_ID>/turns.jsonl` and `probes.jsonl` **as they
happen** — read those rather than waiting for the process, and never pipe the
runner through `tail`, which buffers all output until exit.

## Reading the results

```bash
python -c "
import json,glob
rows=[json.loads(l) for f in glob.glob('results/*/probes.jsonl') for l in open(f)]
from collections import defaultdict
agg=defaultdict(lambda:[0,0])
for r in rows:
    agg[r['probeId']][1]+=1
    if r['pass']: agg[r['probeId']][0]+=1
for k,(a,b) in sorted(agg.items()): print(f'{k:<26} {a}/{b}')
"
```

A probe row carries `threadMessagesAtProbe`, `receiptPresent`, `tokenBudget`
and the raw answer, so a failure can be attributed without re-running.

## Turning a live failure into a regression test

This is the step that makes the lab compound rather than evaporate.

```bash
node export-transcripts.mjs     # captures the real threads to fixtures/
```

Copy the fixture into
`apps/claw-chat-service/src/modules/chat-messages/managers/__tests__/fixtures/`
and replay it through the composer, as
`context-composer.live-replay.spec.ts` already does for the 2026-08-30 run. The
replay asserts **selection**, not generation, so it is deterministic and free.

Keep the distinction the existing spec makes: a model that was given the fact
and refused to answer is a model-quality result, not a context failure. Do not
let one be scored as the other.

## Cleanup

Threads are prefixed `QA-LAB-{runId}-{scenario}` and are left in place on
purpose — a failing probe is only diagnosable if its thread still exists. Delete
them with `DELETE /api/v1/chat-threads/:id` once a run has been written up.

## Gotchas that cost time

- `limit` is capped at **100** on `GET /chat-messages/thread/:id`, and at 200 on
  `GET /routing/models`. Exceeding it returns 400, and a naive client turns that
  into "the thread is empty".
- Messages come back **newest first**. Use `listAllMessages` for oldest-first.
- The access token lives 900 s. `client.mjs` refreshes at 600 s.
- `POST /chat-messages` is fire-and-forget; the assistant reply arrives
  asynchronously. Poll, do not assume.
- The AUTO fast path only applies to `routingMode: 'AUTO'`. A `MANUAL_MODEL` lab
  does not exercise it, so an AUTO-specific regression will not show up.

## See also

- [Architecture](../docs/03-architecture/conversational-context.md)
- [Runbook: context loss triage](../docs/11-runbooks/context-loss-triage.md)
- [ADR-086](../docs/13-adr/adr-086-conversational-context-composer.md)
