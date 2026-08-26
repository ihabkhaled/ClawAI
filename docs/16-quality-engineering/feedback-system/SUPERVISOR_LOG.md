# Supervisor log — Feedback System delivery by the ClawAI Coding Agent

Claude supervises; the ClawAI Coding Agent extension writes the feature code.
This file records what actually happened, including product defects the run
exposed. Dated 2026-08-22.

## Environment

- Worktree `D:\Freelance\Claw-feedback-system`, branch `feature/full-feedback-system`, base `origin/main` @ 75426b6d.
- `code serve-web` on :9888 with `--default-folder /d:/Freelance/Claw-feedback-system`, extension **v0.63.1**, workspace Trusted, account re-authorized (167 models).
- Run config: effort ULTRA, permission AUTONOMOUS_SCOPED, run mode Agent.
- Driven by a Playwright driver on profile `claw-lab-profile3` that polls a command queue and auto-clicks the in-panel `#approvalApprove`.

## Model selection — measured, not assumed

| Model                                  | Result                                                                                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENAI:gpt-5.3-codex`                 | **404** from the provider — `CLOUD_PROVIDER_REQUEST_FAILED`. The OpenAI key has no access to the codex models the catalog advertises.                                                                                                                  |
| `OLLAMA:kimi-k2.7-code`                | Every reply truncated at **exactly 500 output tokens**, cutting the Runtime Protocol 2.0 tool object mid-JSON → `MODEL_TOOL_REQUEST_UNREPAIRABLE`. Reproduced twice, including on a deliberately tiny patch. `OLLAMA:glm-5.2` showed the same ceiling. |
| `GEMINI:models/gemini-3.1-pro-preview` | Works. Writes and patches files reliably; occasional provider 503.                                                                                                                                                                                     |

The 500-token ceiling is a provider-side cap on the Ollama Cloud connector, not
one of ours — `RUNTIME_V2_MAX_OUTPUT_TOKENS` is 32_768 and
`HARD_MAX_OUTPUT_TOKENS` is 16_384. The catalog still lists these models as
usable for agent runs, so a user picking one gets an unexplained failure on
every file write.

## Product defects this run exposed

### 1. A NUL byte in a chat message 500s the thread (chat-service)

Sending a message containing `0x00` produces:

```
ERROR [GlobalExceptionFilter] Unhandled exception:
Database error. Code: `22021`. Message: `invalid byte sequence for encoding "UTF8": 0x00`
PrismaClientKnownRequestError
```

The client gets a bare `Internal server error` and the run dies. The raw Prisma
error text reaches the log unfiltered. Any user pasting binary content, or an
agent echoing a control character, hits this. Message text should be stripped of
C0 control characters before persistence, and the Prisma error should map to a
400, not an unhandled 500.

### 2. A run can stall after a tool result and then block the queue

Run `run_90f64b40e97f498484132bf5376c1016`: the extension posted its tool result,
chat-service answered **201**, and the runtime never issued the next model turn.
The SSE stream `GET /chat-messages/stream/...?after=-1` ran 195 s and closed.
The panel sat at `1 running · workspace.files · create` indefinitely with no
error and no timeout. A message sent afterwards queued as `1 waiting` behind the
dead run instead of starting. Only a workbench reload cleared it.

### 3. The model catalog collapses to empty on every workbench reload

After a reload `#modelSelect` holds no options until the catalog refetches, and
the previously chosen model is lost. Anything that sends during that window runs
on `AUTO`.

### 4. An orphaned webview frame keeps a live `#prompt` after a reload

Two frames answer `#prompt` after a reload; only one is visible. This is a
driver-side hazard rather than a user-facing bug, but it means the old webview
document is not torn down.

## Quality of the generated code — what needed correcting

The agent produces structurally correct code but drifts from repo policy. Each
of these was caught by reading the file, never by the agent's own report:

1. `feedback.constants.ts` was written as a 2-line stub (`MAX_FEEDBACK_TITLE_LENGTH`,
   `MAX_FEEDBACK_DESCRIPTION_LENGTH`) instead of the 16 specified constants.
2. The Mongoose schema and repository used `any[]`, `any` and `Record<string, any>` —
   banned repo-wide.
3. Inline type literals in logic files, against `rules/12`.
4. The ticket number rendered `FDB000001` instead of `FDB-000001`.
5. Double quotes in a single-quote codebase.

All were fixed by the agent after a precise defect description.

### 5. A multi-operation file transaction fails with a misleading error

`assertSingleMatchingOperation` requires `transaction.operations.length === 1`,
but a model that sends four creates in one transaction never sees that rule. The
executor's Zod schema fails first and the model gets back:

```
TOOL_EXECUTION_FAILED: The trusted tool executor failed: [
  { "expected": "string", "code": "invalid_type",
    "path": ["operations", 3, "beforeHash"],
    "message": "Invalid input: expected string, received undefined" } ]
```

So it tries to invent a `beforeHash` for a file that does not exist yet, fails
again, and burns its turn budget. Observed: ~12 minutes and 5 model turns with
zero files written, the panel showing only "Reading workspace". Validating the
operation count **before** the per-operation schema, and saying "exactly one
operation per transaction, got 4", would make this self-correcting.

### 6. serve-web died mid-session

`code serve-web` exited around 18:23 right after
`Extensions added from another source clawai.clawai-coding-agent` — another VS
Code instance writing the shared `extensions.json` under the same
`--server-data-dir`. The browser showed "Attempting to reconnect in 15
seconds…" while every send silently did nothing: the composer still accepted
text and the send button still worked, but no message was ever created. A
disconnected workbench should disable the composer rather than swallow input.

### 7. A missing file is reported as "not readable text"

`workspace.files · read` on a path that does not exist returns
`TOOL_EXECUTION_FAILED: The trusted tool executor failed: Requested file is not
readable text`. The model reads that as "this file exists but is binary" and
keeps probing instead of creating it. A plain "no such file" would let it move
on immediately.

### 8. The agent swapped validation libraries mid-batch

Told only that `z.ZodIssueCode` does not exist in Zod 4, the agent rewrote a
working Zod DTO into `class-validator` / `class-transformer` decorators —
libraries `claw-audit-service` does not depend on, against a repo-wide Zod +
`ZodValidationPipe` convention. Caught by reading the file; the run was killed
and the exact Zod file was handed back to it verbatim. A narrow correction is
not safe to give this agent without also pinning what must NOT change.

### 9. Large files cannot be read, so they can never be patched

`workspace.files · read` on `apps/claw-frontend/src/lib/i18n/locales/en.ts`
(5,409 lines) fails with `TOOL_OUTPUT_INVALID`. Because `patch` requires a
`beforeHash` from a prior successful read, a file that cannot be read can never
be modified. The agent correctly refused to invent a hash and stopped:

> The read failed with `TOOL_OUTPUT_INVALID`, so I did not receive the file's
> sha256 hash. I cannot proceed with the patch because the `patch` operation
> requires a valid `beforeHash` from a prior successful read, and I must not
> invent one.

This is the one place in this feature where the agent was structurally
incapable rather than merely slow. Every locale file in this repo is over 5,000
lines, so i18n — a mandatory part of any user-facing change here — is currently
out of reach for the agent. A ranged read that still yields a whole-file hash,
or an append/insert operation that does not require one, would close the gap.

## Work Claude took over, and why

Provenance matters for this exercise, so this is explicit. The ClawAI Coding
Agent authored the backend module, the frontend reporter and admin components,
the hooks, repositories and constants. Claude took over three things:

1. **Type-error cleanup** (~35 errors across both workspaces) — mechanical, and
   the agent's ~15-line tool-call ceiling made each fix a multi-round retry.
2. **Component/hook contract reconciliation.** The agent wrote each file in
   isolation, so components called a `useFeedbackForm` returning
   `{ onSubmit, type, title, subject, description, ticketNumber, reset }` while
   the hook it wrote returned `{ form, submit, isSubmitting, submitError }`.
   One hook also declared its own `fetch`-based `apiClient` instead of using the
   shared one. Reconciling that was integration work, not cleanup.
3. **All 13 i18n locales**, for the reason in defect 9 above.
