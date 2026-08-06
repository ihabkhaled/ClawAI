# Coding-agent runtime fixes — diagnosis and patches

Untracked scratch note. Written because the four fixes below were applied to the
working tree, verified against the live stack, and then discarded by a
concurrent process before they could be committed. Re-apply from here.

Evidence for every claim is a captured run against `kimi-k2.6:cloud` through
`https://claw.local`, not inspection alone.

---

## 1. Every agent run died on its first model event (CONFIRMED, fix verified)

**Symptom in the UI:** `Runtime event model.turn.started has a mismatched turn
identifier`, then `No runtime run is active` on the next message.

**Root cause:** `eventJson` in
`apps/claw-chat-service/src/modules/chat-messages/repositories/runtime-v2.store.ts`
built the event envelope without a top-level `turnId`. The coding agent's
reducer requires `event.turnId === payload.turnId` for `model.turn.started`
(`apps/claw-coding-agent/src/core/runtime/runtime-event-reducer.ts`,
`projectTurnStarted` → `assertTurn`). The server put the turn only in the
payload, so the first model event of every run was rejected — and because the
turn never opened, later tool calls had no active run to attach to.

Both the client protocol schema and the server's own `runtimeEventSchema`
already declare the optional top-level `turnId`. Only the emitter omitted it.

**Captured before the fix** (a run that otherwise completed fine):

```
[  3] model.turn.started   topLevelTurnId=undefined payload.turnId="turn_540e15..."
[  4] model.delta          topLevelTurnId=undefined payload.turnId="turn_540e15..."
[  5] model.summary        topLevelTurnId=undefined payload.turnId="turn_540e15..."
```

**Captured after the fix:** all three match.

**Patch** — in `eventJson`, add the binding before `payload`:

```ts
    sensitivity: 'sensitive-redacted',
    epochs: input.epochs,
    ...turnBinding(payload),
    payload,
    ...(correlation === undefined ? {} : { correlation }),
  });
}

/**
 * Binds a turn-scoped event to its turn at the top level of the envelope.
 *
 * Deriving the binding from the payload here, rather than at each call site,
 * is what makes the two structurally unable to disagree. Only turn-scoped
 * payloads carry a `turnId` key, so lifecycle and tool events are unaffected.
 */
function turnBinding(payload: RuntimeV2JsonObject): RuntimeV2JsonObject {
  const turnId = payload['turnId'];
  return typeof turnId === 'string' ? { turnId } : {};
}
```

**Regression test** — in
`src/modules/chat-messages/repositories/__tests__/runtime-v2.redis.e2e.ts`,
after the existing model-event ordering assertions:

```ts
for (const event of modelEvents) {
  expect(event.turnId).toBe('runtime_e2e_turn_00008');
  expect(event.turnId).toBe((event.payload as { turnId?: string }).turnId);
}
// Lifecycle events belong to no turn; a bogus turnId would make the client
// project phantom turns.
for (const event of page.events.filter((candidate) => candidate.type.startsWith('run.'))) {
  expect(event.turnId).toBeUndefined();
}
```

---

## 2. Every `RUNTIME_STATE_UNAVAILABLE` was undiagnosable (CONFIRMED, fix verified)

`RuntimeV2Store.execute` used a bare `catch {}` that discarded the cause on the
server as well as the client, so a 503 gave an operator nothing to work with.

Adding the log immediately produced the real cause of a failure I had otherwise
been guessing at: `Runtime V2 Redis operation READ_EVENTS failed: Connection is
closed.` — which then identified the whole failure class as service restarts
(see §4) rather than a Redis defect.

**Patch** — add `Logger` to the `@nestjs/common` import, then:

```ts
export class RuntimeV2Store {
  private readonly logger = new Logger(RuntimeV2Store.name);

  constructor(@Inject(RedisService) private readonly redis: RuntimeV2RedisPort) {}

  private async execute(/* … */) {
    let raw: unknown;
    try {
      raw = await this.redis.executeRuntimeV2({ operation, keys, arguments: arguments_ });
    } catch (error) {
      // The CLIENT message stays opaque: a raw Redis or Lua error can echo
      // argument fragments. Discarding it on the server too is a different
      // mistake — it made every RUNTIME_STATE_UNAVAILABLE undiagnosable. The
      // operation and message are recorded; the arguments deliberately are not.
      this.logger.error(
        `Runtime V2 Redis operation ${operation} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw runtimeV2Unavailable();
    }
    return parseRuntimeV2TaggedReply(raw);
  }
```

---

## 3. Any answer over 64 KiB killed the run (CONFIRMED, unit-tested)

**Captured:** a 113,644-character answer. The server correctly split it into two
deltas, each within the per-event cap — and the client rejected delta two with
`Runtime event model.delta has an invalid payload`.

**Root cause:** the client caps a turn's _cumulative_ text at the same 65,536 it
caps a single delta at (`projectDelta`). Splitting therefore cannot make a long
answer deliverable; the second chunk always pushes the total over. The server
constant's own comment asserted the opposite, and was wrong.

A second, subtler half of the same bug: the server split by `String.length`
(UTF-16 units) while the client measures `TextEncoder().encode().byteLength`, so
a single chunk of non-ASCII text blew the byte cap even as one delta.

**Patch** — `src/modules/chat-messages/constants/runtime-v2-model-events.constants.ts`:

```ts
export const RUNTIME_V2_MODEL_TURN_BYTES = 65_536;
export const RUNTIME_V2_TRUNCATION_NOTICE = '\n\n…[answer truncated at the runtime protocol limit]';
```

`src/modules/chat-messages/utilities/runtime-v2-model-events.utility.ts` —
replace `splitForDeltas` with a byte-bounded clamp and emit one delta:

```ts
export function buildRuntimeV2ModelEvents(
  turnId: string,
  text: string,
): RuntimeV2ModelEventDraft[] {
  const deliverable = clampToTurnBytes(text);
  return [
    { type: 'model.turn.started', payload: { turnId } },
    ...(deliverable === ''
      ? []
      : [{ type: 'model.delta' as const, payload: { turnId, text: deliverable } }]),
    { type: 'model.summary', payload: { turnId, summary: buildSummary(text) } },
  ];
}

/**
 * Bounds a turn's whole answer to what a client will actually accept.
 *
 * The walk is per code point and counts UTF-8 bytes, so a multi-byte character
 * is never split across the boundary and a non-ASCII answer is measured the
 * same way the client measures it.
 */
function clampToTurnBytes(text: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(text).byteLength <= RUNTIME_V2_MODEL_TURN_BYTES) return text;

  const budget =
    RUNTIME_V2_MODEL_TURN_BYTES - encoder.encode(RUNTIME_V2_TRUNCATION_NOTICE).byteLength;
  let bytes = 0;
  let kept = '';
  for (const character of text) {
    const size = encoder.encode(character).byteLength;
    if (bytes + size > budget) break;
    bytes += size;
    kept += character;
  }
  return `${kept}${RUNTIME_V2_TRUNCATION_NOTICE}`;
}
```

The existing test `splits an over-long answer so no single delta breaks the
contract` asserts the broken behaviour (3 deltas) and must be replaced with
truncation, byte-measurement, and no-multi-byte-split cases. 9/9 passed with
those in place.

---

## 4. Failed runs never told the user why (CONFIRMED — fix is in the extension, and survived)

**Captured:** prompt `read C:/Windows/System32/drivers/etc/hosts`. The model
correctly refused, the server emitted `run.failed` **with a reason**, and the
client rejected it: `Runtime event run.failed has an invalid payload`. The user
sees a protocol error instead of the actual cause — strictly worse than the
silence it replaced.

The server added `reason` deliberately (`runtimeV2TerminalReason`, whose
docstring says the point was to let a client show why). The client's
`knownPayloadSchemas` still validated terminal events against a **strict empty**
payload and was never widened.

**Applied in `apps/claw-coding-agent` (a git submodule, so it survived):**
`terminalPayloadSchema` accepting an optional `{ code, message }` reason, mapped
onto `run.failed`, `run.blocked`, `run.cancelled`, `run.completed`.
`run.created` keeps the empty schema. All 747 extension unit tests pass.

**This one needs the extension rebuilt** (`npm run build` / repackage) before it
reaches the installed VS Code client.

---

## 5. The 502 — NOT a runtime defect

`chat-service` never crashed: `restarts=0`, PID stable, 19 fds, 230 MB, Redis 18
clients with 0 rejections. The 502s are the dev container rebuilding —
`[nodemon] restarting due to changes...` fires on any write under
`apps/claw-chat-service/src`, and `npm run build && node dist/main.js` leaves the
port closed for 10–20 s, during which nginx returns
`connect() failed (111: Connection refused)`.

**15 such restarts happened during one 10-minute measurement window**, which is
what produced 95/100 failures in the third round.

The genuine product finding is on the client side: the extension treats a
transient 502 as a terminal run failure with no retry. For a dev-mode user, every
save of a backend source file becomes a hard agent error.

---

## Measurement status

| Round | Pass   | Notes                                                             |
| ----- | ------ | ----------------------------------------------------------------- |
| 1     | 4/100  | Baseline; invalidated mid-run by a rebuild storm                  |
| 2     | 46/100 | turnId fixed. Surfaced §3 and §4. 46 failures were rebuild 502s   |
| 3     | 1/100  | Invalid — 15 service restarts from concurrent work during the run |

No round is a clean measurement of agent quality, because the stack was being
rebuilt underneath every one of them. A trustworthy number needs an exclusive
window on the stack.

The harness lives in the session scratchpad (`claw-runtime-client.mjs`,
`harness.mjs`, `corpus.mjs`, `run-rounds.mjs`). It drives the real HTTP + SSE
endpoints, executes tool calls against this repository, and validates every
streamed event with the extension's own bundled reducer — so a pass means the
real client would have accepted the stream.
