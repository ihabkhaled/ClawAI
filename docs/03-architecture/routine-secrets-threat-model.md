# Routine secrets: threat model (F099 step 2)

Decision and design: [ADR-142](../13-adr/adr-142-per-routine-secrets-isolated-and-write-only.md).
Code: `apps/claw-agent-service/src/modules/agent/services/routine-secret.service.ts`.

## Assets

The plaintext of a routine secret, and the fact that a routine can read only its own.

## Trust boundaries

Owner (user JWT) writes. Agent-service stores ciphertext. The runner (runner token)
receives plaintext once, at claim. The model and the job's tools run inside the runner.
A webhook caller (HMAC) can fire a run but is never a reader.

## Threats and controls

| Threat                                                                         | Control                                                                                                                                                                      | Proof (spec)                                                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Another user reads, replaces or deletes my secret (IDOR)                       | every call resolves the routine with `findByIdForUser`; every query carries routine and owner; foreign routine is the same 404 as a missing one                              | `routine-secret.service.spec` "isolation", `routine-secret.http.spec` byte-identical 404 |
| Routine A's job receives routine B's secret                                    | `resolveForRun` loads by the job's own `routineId` and owner only                                                                                                            | "a job gets only its own routine's secrets"                                              |
| A job row is pointed at someone else's routine                                 | owner of the job must equal owner of the runner and of the routine                                                                                                           | "a job cannot be pointed at another user's routine"                                      |
| Database copy moves a ciphertext to another row                                | AES-GCM AAD over routine + owner + name; AAD built from the row's own columns                                                                                                | `aes-gcm.utility.spec` moved-ciphertext cases, "re-pointed row"                          |
| Database read exposes secrets                                                  | ciphertext only, per-row random nonce, key outside the database                                                                                                              | "stores only ciphertext"                                                                 |
| Owner API leaks a value                                                        | write-only: list returns names and dates; create/replace return metadata; repository selects metadata only                                                                   | list/http specs, repository spec                                                         |
| Value in a log, error or event                                                 | no value is ever passed to a logger; fixed error messages; validation messages never echo input; no events; pino redacts `req.body.value` and `res.body[*].secrets[*].value` | "a value never reaches a log or an error", dto "never echoes"                            |
| Value in the prompt                                                            | the server never templates secrets into `command`; the job row has no secret field                                                                                           | `runner.service.spec` dispatch test                                                      |
| Webhook caller obtains secrets                                                 | a `WEBHOOK` run gets secrets only with the owner's opt-in, default off, read at claim time                                                                                   | "webhook run receives nothing by default"                                                |
| Unknown or forged run source                                                   | any value that is not SCHEDULE, MANUAL or WEBHOOK yields no secrets                                                                                                          | "unknown or missing run source fails closed"                                             |
| Job output echoes a secret into stored stdout/stderr                           | server scrub before storing                                                                                                                                                  | `redactRunOutput` specs                                                                  |
| A secret name changes how the runner loads code (`LD_PRELOAD`, `NODE_OPTIONS`) | reserved names and prefixes refused                                                                                                                                          | `routine-secret.dto.spec`                                                                |
| Burst of creates exceeds the per-routine limit                                 | count and insert in one serializable transaction                                                                                                                             | repository spec                                                                          |
| Stolen runner token                                                            | it can claim only jobs addressed to its own session, as before; revoke or rotate the runner                                                                                  | `agent-runner` specs                                                                     |

## Residual risk, stated plainly

- The routine's tools can read the environment, so a prompt that tells the agent to
  print it can leak a secret into the model's context and answer. Owners should give a
  routine only the secrets it needs and scope them narrowly at the provider.
- Output scrubbing is exact-match: a base64 or URL-encoded secret is not caught.
- A compromised agent-service process holds `ENCRYPTION_KEY` and can decrypt every
  secret. This is the same exposure as connector credentials.
- No key versioning: rotating `ENCRYPTION_KEY` orphans stored secrets.
- Until the runner implements injection (ADR-142), secrets are delivered and ignored.
