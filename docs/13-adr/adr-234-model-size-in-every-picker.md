# ADR-234: Every model list shows how big each model is

Status: Accepted (2026-11-28) · Owner request: "In every model dropdown, and anywhere a list of AI models is shown,
write the context size and parameter size beside each model, e.g. '1M context, 750B parameters'."

## Context

A user choosing between 180 models saw a name, a price band and a few badges, but not the two numbers that say what a
model can do: how much it can read (context window) and how big it is (parameters). The context window existed on the
connector's rows (`maxContextTokens`, shown in two admin tables) and in the routing registry
(`contextWindowTokens`). The parameter count existed nowhere for a cloud model, and only as free text on the local
runtimes (`LocalModel.parameters` "7.6B", llama.cpp `parameterCount` "671B (37B active)").

## Decision

**Data (routing-service).** `RouterModelRegistry` gains `parameterCountBillions` and `activeParameterCountBillions`,
nullable `Decimal(9,3)`, in billions (0.5 = 500M, 1000 = 1T). Migration `20261128120000_add_model_parameter_counts`
(additive, `ADD COLUMN IF NOT EXISTS`, no default, no backfill in SQL). The active column is the per-token share of a
mixture-of-experts model (671 total / 37 active) and is shown in tooltips and the admin detail only.

**A count is never invented.** It comes from, in this order:

1. the local runtime's own report for the file it runs (ollama-service `LocalModel.parameters`, llamacpp-service
   `parameterCount`), forwarded on the existing routing snapshot as `parameterCount` and parsed by routing-service;
2. `PUBLISHED_PARAMETER_COUNT_RULES` (`constants/model-parameter-count.constants.ts`): exact model keys, each rule
   naming the maker page the number was read from (Hugging Face model cards of DeepSeek, Moonshot, Z.ai, OpenAI,
   MiniMax, Microsoft, Cohere, Qwen; Meta's Llama 4 post; Mistral's Mixtral, NeMo and Large 2 posts). Read 2026-11-28;
3. the maker's own model name when it states the count and is unambiguous (`qwen3-235b-a22b`, `gemma-3-27b-it`,
   `llama-3.3-70b-instruct`), for an allow-listed set of families only. This is the marketed figure (`qwen3-30b-a3b` is
   30.5B / 3.3B on its card), and it never parses `8x7b` products, `e4b` "effective" sizes or `17b-16e` expert layouts.

Everything else stays NULL: every closed model (GPT, Claude, Gemini, Grok, Mistral Medium, Command A+) and every
sibling whose card states no count (DeepSeek V3-0324, V3.1-Terminus, V3.2, R1-0528, GLM-4.7, MiniMax-M2.1 were checked
and left out). A model with no count shows its context window alone; one with neither shows nothing.

Fill paths, all of which only fill a gap and never overwrite an admin value: the sync (`RouterSyncManager`, every run,
create and update) and `ModelParameterSeedService` (run-once ledger `model-parameter-counts-2026` v1, advisory lock
`740_040_005`, checksum over the rule table, skips local rows and rows an admin pinned). Admins can set or clear a
count with `PATCH /routing/models/:id` (`parameterCountBillions`, `null` clears); both fields are override-managed, so
a pinned total also stops the sync from writing the active share.

**API.** `GET /routing/model-sizes` (`MODEL_USE_ALLOWED`, the permission of the picker list it decorates) returns
`{ data: [{ provider, modelKey, contextWindowTokens, parameterCountBillions, activeParameterCountBillions }] }`: size
only, never a price. The window follows `getContextWindowSnapshot`'s precedence (enrichment, sync, published family
window), so the picker and the prompt budget cannot disagree. The full registry record (`GET /routing/models`) also
carries the two new fields.

**Frontend.** One formatter (`utilities/model-scale.utility.ts`): `128000` is "128K", `2048` is "2K", `1048576` is
"1M", `7.6` is "7.6B", `1000` is "1T". A window is quoted in thousands or in binary multiples, so the decimal reading
wins when it is clean and the binary one otherwise (never "131.1K", never "125K" for 128000). Digits and the K/M/B/T
suffix are Latin in every locale (an Arabic-Indic digit glued to a Latin letter reorders in an RTL row); the decimal
separator follows the locale. Only the words are translated (`modelScale.*`, 13 locales): "{value} context",
"{value} params". The label is "1M context · 750B params", with any unknown part omitted. `useAvailableModels` (the
choke point of every chat-style picker) attaches `scale: { label, title }` to each `ModelSelection`; the judge and
critic hook, the Smart Router deployment list and two non-picker hooks do the same through the same utility.

| Where it shows                                                                                                                                                                | How                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Composer model picker, Threads, thread settings, Advanced module, Orchestration labs, regenerate and recovery pickers, AI action select, Live card enhance, admin Live chains | `ModelPickerItem` (shared) and the AI action `SelectItem` |
| Compare model list, Escalation chain builder                                                                                                                                  | their own rows                                            |
| Compare judge and critic pickers                                                                                                                                              | `useJudgeModelOptions`                                    |
| Smart Router chain and assistant-model forms                                                                                                                                  | `useSmartRouterSelectableDeployments`                     |
| Connector model table and cards, Models compare dialog                                                                                                                        | a Parameters column/row and `ModelScaleLine`              |
| Admin router model detail drawer                                                                                                                                              | a Parameters row with the active share                    |

In the shared picker row the size sits UNDER the name below `sm` (a phone row is 44px tall and has the room, so both are
readable in full) and BESIDE it from `sm` up, where the name keeps its natural width and the size takes what is left and
clips with an ellipsis (`truncate-fixed min-w-0 sm:flex-1`, `dir="auto"`, full text in `title`). The name never loses
its "120b" to make room for "128K context", and a row never overflows (checked live at 375px and 1280px, dark and light,
English and Arabic). The Compare and Escalation rows put it beside the name and clip it first.

A provider the registry does not carry (HuggingFace, Groq and NVIDIA have no registry rows in development) falls back to
another provider's row for the SAME model key, for the parameter count only (the size of `openai/gpt-oss-120b` does not
depend on who hosts it; a context window can).

## Consequences

- Cloud models gain a parameter count only where a maker published one. In the development registry the first seed filled
  about one row in six; closed models keep showing the window alone, on purpose.
- The picker list is joined client-side with `GET /routing/model-sizes` (one cached request, ten minutes, `retry: false`).
  A failed request shows the window the row already carries and no parameter count; it never breaks a picker.
- A model added by a connector later is filled by the next sync from the same rules; a rule added or corrected needs a
  `MODEL_PARAMETER_SEED_VERSION` bump to reach existing rows.
- The unit letters are not translated. A locale that quotes sizes differently (Japanese 億) would need its own formatter.

## Rejected

- **A column on connector-service's `ConnectorModel`.** The picker list is served there, so it would avoid the join,
  but the parameter count is catalogue knowledge shared with the router (and with local runtimes), the registry already
  owns the window and the admin override, and connector-service would have had to learn about runtimes it does not call.
- **Parsing every model id for a size.** `llama-4-scout-17b-16e` is 109B, `mixtral-8x7b` is 46.7B and `gemma-3n-e4b` is
  8B raw; a generic parser states those wrongly. Only the allow-listed families are parsed, and the exact rules win.
- **Regex rules for the published table.** The security lint flags nested quantifiers, and a pattern can match a sibling
  nobody checked (`deepseek-v3.2`). Exact keys cannot.
- **Showing "?" or "unknown".** A blank is honest, and a "?" on every closed model is noise.

## Operational

Deploy routing-service first (the migration, the seed and `GET /routing/model-sizes` are additive; a frontend that
finds no endpoint simply shows no parameter counts). ollama-service and llamacpp-service forward `parameterCount` on
their snapshot and are safe in either order. No new environment variable, no new event, no nginx change
(`/api/v1/routing` is already proxied).

## Addendum (2026-11-28): the context window of a local model

The first cut showed "27.4B params" beside a local Ollama model and no context, because ollama-service's routing
snapshot never filled `contextWindowTokens` and llamacpp-service forwarded a placeholder for some imports. Both now
state only what the runtime or the file says:

- **Ollama.** `OllamaContextWindowManager` asks Ollama itself (`POST /api/show`, `model_info`
  `<arch>.context_length`) once per installed model, with the same bounds as connector-service's lookup (4 in flight,
  5 s each, 100 per snapshot, 30 s in total, a day in cache, an hour after a failure), and keeps a window it read earlier
  through a failed lookup because routing-service writes NULL over a window the snapshot omits. No key, a timeout or a
  malformed body leaves the window out. Read-only check on the dev stack (`ollama show`): all 16 installed models state a
  context length, so one sync fills all 16.
- **llama.cpp.** The catalog has no GGUF context length of its own, and `contextLength` is not nullable, so a
  HuggingFace import without GGUF metadata was stored with the placeholder 32,768 and forwarded as if it were the
  model's window. Imports now read `gguf.context_length` from `GET /api/models/<repo>?expand[]=gguf`, and the snapshot
  never forwards a placeholder (an import's license marker plus the placeholder value) or a non-positive window.
  Rows imported earlier keep the placeholder in the table and are simply not forwarded; a nullable column would be the
  clean fix and is a schema change left for later.
- **Rejected:** importing connector-service's parser into ollama-service (services never share code outside
  `@claw/shared-*`, and a new shared symbol crashes running dev containers until rebuilt), and defaulting a missing
  window to the model family's published one in the runtime service (routing-service already applies that fallback,
  `knownContextWindow`, when it serves the window).
