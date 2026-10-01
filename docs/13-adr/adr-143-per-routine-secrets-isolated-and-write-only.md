# ADR-142: Per-routine secrets are encrypted, write-only and bound to their routine

- Status: Accepted (server side built 2026-10-01; runner consumption pending, see below)
- Date: 2026-10-01

## Context

F099 step 1 shipped the signed webhook for prompt routines. Step 2 is the part the
decisions log held back as a security boundary: secrets a routine can read (a token
for the repository host, a deploy key, an API key), so a scheduled or webhook-fired
run can act without the owner pasting credentials into the prompt. The owner decided
on 2026-10-01 to build it, strictly isolated per routine.

## Decision

**Store.** `routine_secrets` in the agent-service database: `routineId`, `userId`,
`name`, `ciphertext`. Unique on `(routineId, name)`, cascade-deleted with the routine.
Only ciphertext is stored.

**Crypto.** The scheme the connector, auth and research services already use for
`ENCRYPTION_KEY`: AES-256-GCM, a random 16-byte nonce per row, 16-byte tag,
`base64(nonce || tag || ciphertext)`. The one addition is additional authenticated
data, `JSON.stringify([label, routineId, userId, name])`, so a ciphertext copied to
another routine, user or name fails the tag check. Agent-service had no helper (every
service keeps its own copy of the connector's), so `common/utilities/aes-gcm.utility.ts`
is that scheme plus the AAD argument. The key is `AppConfig.ENCRYPTION_KEY`, read
through `ChannelKeyring`; nothing logs it and no error message carries it.

**Owner routes** (user JWT, `agent/scheduled-commands/:id/...`):
`GET secrets` (names, dates, the limit, the webhook flag), `POST secrets`
`{name, value}` (201, 409 on a duplicate, 422 over the limit), `PUT secrets/:name`
`{value}` (replace, 404 if absent), `DELETE secrets/:name` (204),
`PUT secrets-policy` `{webhookRunsReceiveSecrets}`. Names are `[A-Z][A-Z0-9_]{0,63}`
and not `PATH`, `HOME`, `NODE_OPTIONS`, `BASH_ENV`, `CLAW_*`, `LD_*`, `DYLD_*` and
similar (they become environment variables on the runner and must not change how it
loads code). A value is 1 to 8192 UTF-8 bytes and may not contain NUL. At most 20 per
routine, counted in a serializable transaction. Values are write-only: no route
returns one, and none echoes a request body. Only PROMPT routines have secrets.

**Injection.** The job row never holds a secret. `dispatchPrompt` records `routineId`
and `routineRunSource` (`SCHEDULE`, `MANUAL`, `WEBHOOK`) on the `terminal_commands`
row. When the runner claims the job over its own authenticated channel
(`POST agent/runners/claim`, `RunnerTokenGuard` only), `RunnerService.claim` asks
`RoutineSecretService.resolveForRun`, which returns decrypted secrets only if: the job
has a routine and a known run source, the runner's owner is the job's owner, the
routine still exists, is a PROMPT routine and belongs to that owner, and, for a
`WEBHOOK` run, the owner has switched `webhookSecretsEnabled` on (off by default,
read at claim time so turning it off also stops jobs already queued). Every claimed
job carries `secrets: [{name, value}]` (empty when none are granted). They exist only
in that response.

**Output.** On completion, the job's `stdout` and `stderr` have every secret value of
its routine replaced by `[REDACTED]` before they are stored (exact matches, values of
4 characters or more, longest first).

**Never in:** the prompt (the server never templates secrets into `command`), logs
(only routine id, owner id and secret name are logged), errors (fixed messages;
validation messages never echo a value), events (none are published), the job row,
the list endpoint, or the pino request/response bodies (`req.body.value` and
`res.body[*].secrets[*].value` are redacted as a second layer).

## Consequences

- Cross-user access is a 404 identical to a missing routine, on every route.
- A database copy of a ciphertext cannot be opened under another routine, user or name.
- Rotating `ENCRYPTION_KEY` makes every stored secret unreadable (logged as a decrypt
  failure per secret, the job runs without it). There is no key versioning yet; a
  rotation needs a re-encrypt job.
- A secret reaches the model's environment by design: the routine's own tools can read
  it. The runner must keep it out of the prompt and out of its logs; the server scrub is
  a backstop for plain-text echoes, not for a re-encoded value.

## Runner change still needed (not in this repository)

The runner is the coding-agent extension (separate repository). It must read
`secrets` from each claimed job and export them as environment variables of the
headless SDK process and its tool subprocesses only; never append them to the prompt,
never write them to its output channel or disk, and drop them when the job ends. Until
it does, the server hands them over and an older runner ignores the unknown field, so a
run proceeds without secrets.

## What would make this stale

Key versioning or a KMS; a secret readable by the owner (a reveal route); secrets on
COMMAND routines; org-level or shared secrets; per-secret webhook opt-in; a second
delivery channel besides the runner claim; or output scrubbing moving to the runner.
