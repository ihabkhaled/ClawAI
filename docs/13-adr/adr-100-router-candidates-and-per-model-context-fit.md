# ADR-100: The AUTO router picks from exposed models, and every prompt is fitted to the model's window

**Status**: Accepted
**Date**: 2026-09-19

## Context

Production, 2026-09-19. Checked over SSH, read-only:

- **AUTO almost always answered with Gemini.** The cloud router only picked
  `ACTIVE` deployments. A deployment became `ACTIVE` only when its alias was
  named in the router chain (`activateDeployments`). As a result, 4 of 354
  deployments were selectable, and 3 of those were Gemini. Admins had
  exposed 69 chat models across Anthropic, OpenAI, Gemini and Ollama, but the
  router could see none of them.
- **The research planner never ran in production.** It called
  `ollama-service`, which production does not deploy
  (`CLAW_LOCAL_AI=false`). Every plan failed, and every crawl fell back to the
  12-page default. The cloud router did work, because it calls
  `ollama.com/api/chat` directly with the admin's Ollama connector key.
- **Context windows were unknown.** 156 of 175 catalog rows had no window.
  OpenAI, Anthropic and xAI list model ids only, and Gemini sync read the
  OpenAI-compatible list, which has no limits. So chat-service budgeted every
  one of these models as 32k.
- **Only research was ever fitted.** Memories, context packs, attached files
  (up to 100k characters each) and the last three turns were counted, but never
  trimmed. A test proved an 8k model received a 16.7k-token prompt.
- **"The context window was full"** was actually an output cap. A short AUTO
  prompt takes the fast path, which caps output at 512 tokens. Gemini 3.6
  spent those on hidden thinking and stopped after 65 characters, with a
  9k-token prompt.

## Decision

1. **Router candidates = admin-exposed chat models.** The candidate list is
   built from connector-service's snapshot, which now carries `exposure` and
   `kind`. Any non-disabled deployment state qualifies. Candidates are then
   filtered by connector health and the user's plan (`allowedModels`, which
   the router now receives). Proven (`ACTIVE`) models come first, then the
   list takes one model per provider in turn, up to 30. If connector-service
   cannot be read, the router falls back to ACTIVE-only.
2. **Hosted assistant models run on hosted Ollama.** A planner candidate with
   provider `OLLAMA_CLOUD` is called at `ollama.com/api/chat` with the Ollama
   connector key. It never goes through ollama-service.
3. **One context-window table** lives in `@claw/shared-utilities`
   (`knownContextWindow`):
   - connector sync fills gaps from it;
   - Gemini sync reads real limits from Google's native `models` list;
   - routing's context-window endpoint falls back to the table when the
     catalog row is empty.

   The catalog value always wins over the table.

4. **Every source is fitted to the model's input window, each with its own
   share:**

   | Source        | Share |
   | ------------- | ----- |
   | research      | 45%   |
   | files         | 25%   |
   | context packs | 10%   |
   | memories      | 5%    |

   Each source is shortened evenly first, then its lowest-ranked items are
   dropped. The history turn floor shortens its messages instead of
   overspending the budget.

5. **Fast-path rules:**
   - A fast-path answer that stops at `length` is re-asked in full.
   - A turn that carries evidence or files never takes the fast path.
   - The banner now says the answer hit its length limit. It no longer blames
     the context window.

## Consequences

- A model an admin exposes or hides reaches the router within 60 seconds,
  with no restart.
- A model that is exposed but never validated can be picked. The fallback
  chain covers it if it fails.
- The context-window table must be updated when a provider ships a new
  family. Until then, a model in an unknown family is still budgeted at 32k.

## Enforcement

The following specs enforce this ADR:

- `cloud-router-eligibility.manager.spec.ts`
- `cloud-router-candidates.utility.spec.ts`
- `exposed-models.service.spec.ts`
- `research-gate.service.spec.ts` (the "on Ollama Cloud" block)
- `model-context-window.utility.spec.ts`
- `gemini-context-window.spec.ts`
- `router-models.service.spec.ts`
- `context-assembly-window-fit.spec.ts` (8 windows, from 8k to 2M)
- `chat-execution.manager.spec.ts` (the fast-path cases)

The rule is [rules/51](../../rules/51-router-candidates-and-model-window-fit.md).
