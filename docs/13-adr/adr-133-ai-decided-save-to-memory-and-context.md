# ADR-133 — A model decides "remember this / add this to my context", and asks which pack

## Status

Accepted — 2026-09-30, at the owner's direction (chat, 2026-09-30). Supersedes
the "no model path" choice in [ADR-127](adr-127-memory-and-packs-stored-whole-retrieved-by-relevance.md)'s
"saving from chat" addendum; the deterministic keyword path is kept as the
fallback. Governing rule: [rule 57](../../rules/57-memory-and-context-pack-integrity.md) §11.

## Context

Saving from chat was keyword-only: `detectSaveToContextIntent` (13 locales)
recognised a command at the start of a message, saved to ONE target (memory
with a keyword-guessed type, or a brand-new pack), and answered with a
zero-token template linking to `/memory` or `/context`. The owner asked for:

1. a model — not keyword matching — deciding memory, context pack, or both;
2. the saved text processed/summarised as needed, with the right memory type;
3. adding to an existing pack, and asking which pack when none was named;
4. a saved card in the chat with links to the exact item, persisted in history;
5. the AI itself confirming it is done.

Owner choices (2026-09-30): the planner model classifies behind a pre-filter;
ask only for the pack (the type is chosen by the model and editable from the
link); the AI writes the reply with a card under it; the keyword path stays as
a fallback.

## Decision

1. **Pre-filter → planner → save.** `mightBeSaveRequest` (a broad word list in
   the 13 UI languages, plus the keyword command detector) decides only whether
   to ASK. `ContextSaveOrchestratorManager` then asks the admin's planner models
   (`ResearchGateService.askPlanner` — the research gate's candidates, order,
   timeout and fail-closed walk; like every planner call these are NOT
   PAYG-metered — ADR-098 records that as a known gap, and this batch widens
   it to save-like messages) with the message, the message before it and the user's pack names,
   for one validated JSON verdict (`saveIntentVerdictSchema`): save or not,
   memory `{type, text}`, context pack `{source, summary, packName, newPackName}`,
   or both. A question ABOUT memory is `save=false`.
2. **What is kept.** A memory is the model's one concise sentence with the
   model's type (FACT/PREFERENCE/INSTRUCTION/SUMMARY). A pack keeps the user's
   own text or the previous message WHOLE (rule 57 §1); only an explicit
   "summarise and save" stores the model's summary.
3. **Which pack.** A named pack is matched to the user's packs (added to) or
   created under that name; with no name and existing packs, NOTHING is guessed
   — the answer carries a "which pack?" card; with no packs, a new pack is
   created. memory-service gained two owner-scoped internal routes:
   `POST /internal/context-packs/options-for-chat` and
   `POST /internal/context-packs/:id/items/from-chat` (ownership via `addItem`).
4. **The answer.** Saves run BEFORE the answering model; its system prompt gets
   a platform note (`contextSaveModelNote`) saying exactly what was saved with
   the deep links, so the model confirms in its own words and never invents a
   link. The answer stores `metadata.contextSave` (status, memory, pack,
   failures, pending choice), which the frontend `ContextSaveCard` renders — so
   a reload shows the same card.
5. **The choice.** `POST /chat-messages/:id/context-save {packId | newPack}`
   (owner via the thread; 404 otherwise) claims the pending save atomically
   (`transitionContextSave`, a JSON-path conditional update) so a double click
   saves once, saves, and rewrites the record; a failure puts the card back to
   "choose" with the reason and a translated error code.
6. **Deep links.** `/memory?memoryId=` opens that memory in the editor (where
   its type can be changed); `/context?packId=` opens that pack.
7. **Fallback.** With no planner answering, the previous keyword path saves
   and replies with its template — the feature never goes dark.
8. **No double memory.** A save turn's `message.completed` carries no
   `userContent`, as the keyword path already did, so extraction does not file
   a duplicate suggestion of what was just saved.

## Rejected alternatives

- **Answering-model tool calling** (`save_memory` tool). A server-side tool
  loop exists only for the Ollama dialect; OpenAI/Anthropic/Gemini would need
  new loop work first, and every turn would carry the tool schema.
- **Classify every turn.** One extra model call per message. The pre-filter
  keeps MOST ordinary turns free; common words (`context`, `memory`) still
  trigger a planner call on some ordinary technical chat — a latency and
  unmetered-cost trade the owner accepted.
- **Guess the pack.** Silently filing material in the wrong pack is worse than
  one click.

## Consequences

- A save turn now costs a normal answer's tokens (the AI confirms), plus one
  unmetered planner call; the keyword fallback stays zero-token.
- Pending pack content lives on the answer's metadata until chosen; text over
  the pack-item limit (250,000 chars) is refused as LIMIT before it is parked
  (`SAVE_PACK_CONTENT_MAX_CHARS`), never cut.
- A regenerated save turn runs the save again. Memory saves and new-pack saves
  were already idempotent on the user message; adding to an existing pack is
  idempotent on the same text in that pack (`findItemWithContent`).
- Known gap: if the answering model fails AFTER the save, the save happened but
  the error answer carries no card (a pending pack choice is lost).
- Known gap: a crash between the atomic claim and the final write leaves the
  card SAVING; a retry answers `CONTEXT_SAVE_NOT_PENDING`. No reclaim yet.
- Changing a saved memory's type happens on the Memory page via the deep link,
  not on the card.
- Tests: chat-service `context-save-orchestrator.manager.spec.ts`,
  `context-save-choice.service.spec.ts`, `save-intent.utility.spec.ts`,
  `chat-messages.service.spec.ts` (note reaches the model, record stored, no
  re-extraction); memory-service `context-pack-chat.service.spec.ts`,
  controller spec; frontend `context-save-card.test.tsx`,
  `use-context-save-card.test.tsx`, `use-context-page-deep-link.test.ts`.

## What would make this stale

A second prompt path for save turns that skips `withContextSaveNote` (the model
would deny having saved), or a pack-save route that stops checking ownership.
