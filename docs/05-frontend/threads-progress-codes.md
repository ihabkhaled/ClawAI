# Threads progress and refusal codes in the frontend

Where the owner's Thread progress panel and the start form turn machine codes into plain words, in all 13 locales.

## Two kinds of code

| Kind          | Where it comes from                                                                                                                                                     | Map                           | Text lives under                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------- |
| Step code     | A step or failure of a running job (thread-generation-service)                                                                                                          | `THREAD_GENERATION_CODE_KEYS` | `chat.threadProgress.code.<key>` and `.hint.<key>` |
| Start refusal | `POST /thread-publications/generations` refused before queueing (threads-service, [ADR-174](../13-adr/adr-174-threads-refuses-what-cannot-succeed-before-it-queues.md)) | `THREAD_START_ERROR_KEYS`     | `chat.threadProgress.startError.<key>`             |

Both maps are in `apps/claw-frontend/src/constants/thread-generation-progress.constants.ts`. A code with no entry
renders the generic "Something went wrong ({code})" pair, so every code a service can emit needs an entry.

## Model-call codes (idle-based timeout)

A model call is never stopped for being slow while it still streams or thinks. It is stopped only after silence or at a ceiling:

| Code                         | Plain meaning                                                  | Hint                                           |
| ---------------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| `MODEL_IDLE_TIMEOUT`         | No byte from the model for 5 minutes, so it is stuck           | Retry or pick another model                    |
| `MODEL_HARD_CEILING`         | One call ran 10 minutes                                        | Faster model or shorter topic                  |
| `MODEL_REASONED_NO_ANSWER`   | The model spent its output budget thinking and wrote no answer | Retry, a more direct model, or a shorter topic |
| `GENERATION_ATTEMPT_TIMEOUT` | One attempt ran 25 minutes                                     | Faster models or a shorter topic               |

While a job runs and has not failed, the panel shows one status line, `chat.threadProgress.stillWorking`
(testid `thread-progress-still-working`): slow models can take minutes, and a model counts as stuck only after
5 minutes of silence. It is static wording, not a timer, so it cannot disagree with the service.

A job that is still `QUEUED` has not started, so none of that applies: the headline is `chat.threadProgress.statusQueued`
("Waiting in the queue"), `queuedHint` explains it (testid `thread-progress-queued`), and the attempt counter and the still-working
line are hidden. "Spent so far" appears only once the amount is above zero. See [threads-buttons-and-publish-banner.md](threads-buttons-and-publish-banner.md).

## Start refusals

`resolveThreadErrorMessage` checks the refusal code before the HTTP status, so a 403 with
`MODEL_NOT_ALLOWED_FOR_PLAN` reads "A selected model is not included in your plan" rather than the generic plan
block. `useThreadGenerationForm` leaves `isPlanBlocked` false for these codes; a 403 with no known code still shows
the plan block and upgrade link. The service message (English, names the seat and model) is not shown; the
translated sentence has no placeholders.

## Codes added with the queue and concurrency work (2026-10-13)

The Threads and thread-generation services gained codes the contract tests above require a sentence for, so they are mapped
and translated in 13 locales: step code `QUEUE_EXPIRED` (a job that waited in the queue too long, `code.queueExpired` and
`hint.queueExpired`) and start refusals `THREAD_GENERATION_ALLOWANCE_UNAVAILABLE`, `THREAD_GENERATION_TOO_MANY_ACTIVE`,
`THREAD_IDEMPOTENCY_KEY_REUSED`, `THREAD_GENERATION_NOT_CANCELLABLE`, `THREAD_TOPIC_INVALID` and `THREAD_TEXT_INVALID`
(`startError.allowanceUnavailable`, `tooManyActive`, `idempotencyKeyReused`, `notCancellable`, `topicInvalid`, `textInvalid`).
The sentences follow the service enum comments; if a service changes what a code means, change the sentence with it.

## Tests

- `src/constants/__tests__/thread-generation-code-keys.test.ts` reads the thread-generation-service step-code
  constants and the threads-service `thread-generation-error-code.enum.ts`, and fails when a code has no map entry.
- `src/lib/i18n/__tests__/thread-progress-translations.test.ts` fails when a locale lacks a key, changes a
  placeholder, or copies the English text for the codes above.

## Production bug batch (ADR-183)

Owner-facing changes, all strings under `chat.threadFix*` in 13 locales:

- The topic boxes (start and retry) use the script-aware minimum (`isThreadTopicLongEnough`: 10 letters or numbers, 4 for Chinese, Japanese or Korean) and show `threadFixTopicTooShort`; the native `minLength` is gone because it counts UTF-16 units.
- A draft the sensitive-details scan blocked shows `ThreadSafetyBlockNotice` with each flagged passage (secrets and card numbers masked) above the edit form. Edit the text and save: the edit is re-scanned and, if clean, reviewed as usual.
- A `DEGRADED` model is selectable and labelled "failing often right now".
- A queued job says "You are next" or "N jobs are ahead of yours" (`progress.queue`).
- The public Thread and the Board reader strip unresolved source markers, also in Arabic-Indic digits and CJK brackets, and unwrap `[https://...]`.
