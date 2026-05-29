# Universal Token Accounting & Judge-as-a-Role

This doc covers the architecture for the four features delivered in `f739a256`:

1. **Universal token accounting** — every model call (chat + every multi-model
   mode + judge) deducts from the user's daily quota.
2. **Judge-as-a-role** — any enabled cloud connector or local model can act as
   the judge.
3. **Compare results scroll/expand** — independent per-card scroll + expand dialog.
4. **Markdown preview + `.md` export** — raw/markdown toggle and download per
   result + "export all".

## 1. Universal token deduction (the single chokepoint)

### The problem before

`AccessControlService.recordUsage` (which calls auth `finalizeQuota`) was only
fired from `ChatMessagesService.publishMessageCompleted`, i.e. for normal chat
and the regenerate path. Compare (`ParallelExecutionManager`) and every other
orchestration mode (`consensus`, `escalation-chain`, `repair`, `verify`,
`best-of-n`, `cost-ensemble`, `role-pack`, `pipeline`, `task-decomposition`) ran
real model calls — but bypassed deduction entirely. Tokens were counted on the
message but never charged.

### The fix — one chokepoint, every mode covered

All model calls funnel through `ChatExecutionManager.callProvider()`. The wrapper
now records usage there:

```ts
// apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts
async callProvider(...): Promise<LlmResponse> {
  const response = await this.dispatchProvider(...);
  if (this.isGenerationResponse(response)) return response;          // image/file gen — no tokens
  const tagged = { ...response, tokenContext: tokenContext ?? TokenLedgerContext.CHAT };
  this.recordChokepointUsage(context, tagged);                       // ← universal deduction
  return tagged;
}

private recordChokepointUsage(context: AssembledContext, response: LlmResponse): void {
  if (!context.userId) return;
  void this.accessControlService.recordUsage({
    userId: context.userId, planId: null,
    inputTokens: response.inputTokens ?? 0, outputTokens: response.outputTokens ?? 0,
    provider: response.provider, model: response.model,
  });
}
```

`AssembledContext.userId` is already populated by every mode (`buildContext(userId, …)`
in parallel/consensus/escalation, and the spread-derived `criticContext`/`judgeContext`/
`revisedContext` in `judge-referee.manager.ts`). No threading required. The old
chat-only `recordCompletionUsage`/`recordJudgeUsage` were removed to avoid
double-counting normal chat.

### Context tagging + audit attribution

The wrapper also stamps a `TokenLedgerContext` (`CHAT` | `COMPARE` | `JUDGE` | …)
on the response. `publishMessageCompleted` forwards `userId`, `tokenContext`,
`tokenEstimated`, `tokenSource` on `MESSAGE_COMPLETED`; `claw-audit-service` writes
the **real** `userId` (was `'system'`) and the `context` into `usage_ledger`, and
exposes `GET /usage?context=…` for filtering.

### Estimator fallback (no "0 tokens" silently)

`@claw/shared-utilities/token-usage/`:

- `estimateTextTokens(text)` — `ceil(len/4)` (`TokenEstimatorKind.CHAR_DIV_4`).
- `normalizeTokenUsage({...})` — fills missing prompt/completion sides from text,
  setting `estimated`/`source` (`NATIVE` / `ESTIMATED` / `MIXED`).
- `extract{OpenAiCompatible,Anthropic,Gemini,Bedrock,Ollama,Llamacpp}Usage(resp, opts)` —
  defensively read native usage; on any missing side, fall back to the estimator.

Each parse method in `ChatExecutionManager` (`parseCloudResponse`,
`buildOllamaResponse`, `parseOllamaChatResponse`, llamacpp path) now goes through
these. `LlmResponse` carries `tokenEstimated` + `tokenSource` so the UI can show
"estimated".

### Preflight (429) policy

`AccessControlService.assertCanSendMessage(userId)` still runs at the normal-chat
entry (`ChatMessagesService.createMessage`) and throws `429` when `quota.remaining <= 0`.
Other-mode entrypoints rely on the chokepoint deduction (post-hoc); when a user is
exhausted mid-mode, the next normal chat request 429s. Hard-429 upfront on every
mode is a follow-up.

## 2. Judge-as-a-role

The judge is no longer "the local Ollama AUTO model." Any enabled cloud connector
or local model can judge.

### Frontend — unified selector

`useJudgeModelOptions` returns local Ollama (plain `name:tag` value, preserves
existing local behaviour) **plus** all cloud connector models encoded as
`PROVIDER:model` (e.g. `OPENAI:gpt-4o-mini`, `ANTHROPIC:claude-sonnet-4`).
`CompareJudgeControls` lists them grouped + sorted.

### Backend — robust parse + same execution path

`parseJudgeModel(raw)` (`apps/claw-chat-service/src/common/utilities/`) splits on the
first `:` only when the leading segment matches `KNOWN_JUDGE_PROVIDERS`
(case-insensitive). That disambiguates `OPENAI:gpt-4o-mini` (cloud) from local
`name:tag` like `gemma3:4b` (kept whole). `JudgeRefereeManager.resolveJudgeTarget`
uses it; the critic / judge / revision calls all flow through
`executionManager.callProvider(..., TokenLedgerContext.JUDGE)` — so they're
token-accounted at the chokepoint like everything else.

## 3. Compare results — scroll/expand

`apps/claw-frontend/src/components/chat/compare-result-card.tsx` (extracted per the
"no inline sub-components" rule, controller hook `use-compare-result-card.ts`):

- Header `shrink-0` (model/provider/badges/judge state).
- Body `max-h-96 overflow-y-auto` — scrolls within the card; the page no longer
  blows out on long outputs. Renders raw (`<pre className="whitespace-pre-wrap break-words">`)
  or Markdown (`MarkdownRenderer`) per view mode.
- Footer toolbar with Raw/Markdown toggle, Copy, Download `.md`, Expand.
- Expand opens a shadcn `Dialog` with `max-h-[80vh] overflow-y-auto` honouring the
  active view mode.

A grid-level "Export all (.md)" button appears when ≥1 completed result is present.

## 4. Markdown export

`apps/claw-frontend/src/utilities/markdown-export.utility.ts`:

- `buildCompareResultMarkdown(input)` — YAML frontmatter (`source: ClawAI Compare`,
  provider, model, latencyMs, prompt/completion/total tokens, `createdAt`) +
  `# {model}` heading + the content.
- `buildCompareRunMarkdown(prompt, results)` — combined doc, one `##` section per
  result.
- `downloadMarkdownFile(filename, content)` — Blob + anchor download, SSR-guarded.

Safe by default — uses the existing `react-markdown` + `remark-gfm` + `rehype-highlight`
pipeline, no `rehype-raw`.

## API additions

| Endpoint | What changed |
|---|---|
| `GET /api/v1/usage?context=…` | New optional `context` filter (`CHAT`, `COMPARE`, `JUDGE`, …) on the audit usage list. |
| `POST /api/v1/chat-messages/parallel` | `judgeModel` may now be `"PROVIDER:model"` for a cloud judge; plain names stay local. |

No new prefixes / nginx changes / env vars / migrations — by design all four
features extend existing infrastructure (auth `Plan.dailyTokenQuota` + `QuotaService`,
`TokenUsageLedger`, audit `UsageLedger`, the `MarkdownRenderer`, `ChatMessage.metadata`
JSON for judge metadata).

## Testing

- Unit: `shared-utilities` 83 specs (estimator + 6 extractors); `audit` 91; `chat` 482
  (incl. `judge-model-parse.utility.spec`); `frontend` 740 (vitest, incl. the new
  compare card + markdown export + judge selector).
- Live QA script: `qa/test-universal-judge-token-compare-markdown.sh` — snapshots
  `quota.remaining` before/after each mode (chat, compare per-model, compare+cloud-judge,
  consensus) and asserts strict decrease; checks `?context=` filter and `429`.
