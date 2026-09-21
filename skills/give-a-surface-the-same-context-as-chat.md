# Skill — Give a surface the same context a chat turn gets

**When you need this**: you are adding or fixing anything that asks a model a
question — a new orchestration mode, a judge, a critic, an agent loop — and it
needs the conversation, the user's files, their memories, relevant previous
threads and research evidence.

**Do not assemble context yourself.** Call
`ChatContextGatewayManager.build()` and pass what makes your surface different.

**Related**: [`rules/02-backend-rules.md`](../rules/02-backend-rules.md) ·
[`docs/04-backend/service-guide-chat.md`](../docs/04-backend/service-guide-chat.md)

---

## Why this exists

Context used to be something each caller remembered to fetch. Four shapes of
that one defect were live at the same time:

- Compare, Consensus and Escalation each carried a **byte-for-byte copy** of the
  same eighteen-line builder.
- The seven lab modes — Repair, Decompose, Best-of-N, Verifier, Pipeline,
  Cost-Ensemble, Role Pack — sent the user's **raw string** to a model: no
  history, no files, no memory, no system prompt.
- The judge and critic **replaced** the conversation with one synthetic message,
  so they judged an answer without seeing the question it answered.
- The coding agent passed `undefined` for attachments and cross-thread context
  for months, silently, because `assemble()` takes seven positional arguments.

## Using it

```ts
const bundle = await this.chatContextGateway.build({
  userId,
  threadId, // null for a run with no thread yet
  surface: ChatSurface.BEST_OF_N, // add a member for a new surface
  historyLimit: MODE_HISTORY_MESSAGE_LIMIT,
  fileIds, // only when they arrive on a DTO
  personaInstruction, // a role, a stage instruction, a tool catalogue
  provider,
  model, // so the REAL context window is used
  routedMessageId, // to re-run an older turn as it was
});
```

`bundle` carries `context`, `thread`, `threadSettings`, `messages`, `fileIds`
and `latestUserMetadata` — everything the old copies re-queried by hand.

## The rules that do not bend

- **A persona is added to the system prompt, never swapped for it.** Replacing
  it is exactly how the judge stopped knowing what the user had asked the model
  to be. `personaInstruction` appends.
- **Always pass `provider` and `model` when you know them.** Without them
  `resolveModelTokenBudget` falls back to a deliberately small window, so a
  1M-token model is budgeted as if it were tiny and history is discarded that
  there was room for. This is the bug the coding agent shipped with.
- **Never re-fetch the thread or the history yourself.** If you need them, they
  are on the bundle. A second query is how the copies started.
- **Never widen `assemble()`'s positional signature.** Add a field to
  `ChatContextRequest` instead; a positional argument is a thing the next caller
  will forget to pass, silently.
- **Building context and spending money are separate.** The gateway calls no
  model. That separation is what lets a judge reuse the exact bundle its
  generator saw.

## Adding a new surface

1. Add a member to `ChatSurface` (`src/common/enums/chat-surface.enum.ts`).
2. Call `build()` with it. Do not add a branch inside the gateway unless the
   surface genuinely needs different _material_ — a different persona or history
   depth is a request field, not a branch.
3. Assert what your surface sends in its own spec, and what it must NOT lose.

## Verify

```bash
cd apps/claw-chat-service
npx vitest run src/modules/chat-messages/managers/__tests__/chat-context-gateway.manager.spec.ts
npm test
```

Then the live lane per [`rules/49`](../rules/49-qa-team-discipline-and-test-evidence.md):
attach a file, say something a previous thread answered, and confirm from the
service log line (`build: surface=… files=… memories=… crossThread=…`) that your
surface actually received them. The log exists for exactly this check.
