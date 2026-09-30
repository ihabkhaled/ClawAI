# ADR-136: Every model is told, invisibly, where it is running

- **Status:** Accepted
- **Date:** 2026-09-30
- **Deciders:** Product owner (request), engineering
- **Related:** rule [57](../../rules/57-memory-and-context-pack-integrity.md) item 16,
  rule [41](../../rules/41-web-evidence-truthfulness.md) item 3

## Context

A user saved "the current webapp is ClawAI, claw-ai.co" as a memory, and only then did
the model answer "what is the current webapp?". Every other user, every other model and
every new thread got a model with no idea it was inside ClawAI. The owner wants that
awareness to be global, to survive a domain or address change, and to be **invisible**:
never a memory, never a context item, never in the UI or in an API response.

## Decision

1. **A hidden layer, added at assembly time.** `buildPlatformIdentityBlock` (chat-service
   `utilities/platform-identity.utility.ts`, text in
   `constants/platform-identity.constants.ts`) is the FIRST part of the system message in
   every prompt builder (`buildSystemMessageParts`, `buildPromptString`), so it reaches
   every model and every flow that assembles a context: chat, compare lanes, judge and the
   labs. It says what ClawAI is ("Every AI, one workspace"), what the workspace offers,
   where the model is, and what it cannot see.
2. **Invisible by construction.** It is built per request from constants and the
   configured origin. It is never written to a table, never put in `memories`,
   `contextPackItems`, `systemPrompt` or `threadMessages`, and never added to a "context
   used" receipt, so no API response or UI panel can list it. The block tells the
   model not to present it as a memory or context item the user saved and not to quote it;
   it must never DENY having instructions if asked (honesty over secrecy, rule 41).
3. **The address is configuration, not text.** `AssembledContext.platformOrigin` comes
   from `PUBLIC_SITE_URL` when the request is assembled, so a changed domain reaches every
   model on the next message with no code edit.
4. **The window pays for it.** `estimateSystemOverheadTokens` counts the block, so history
   is fitted against what is actually left (`context-assembly-window-fit.spec.ts` failed
   with prompts over the window until it was counted).
5. **Ask, and it looks.** A question about the app itself ("what is the current webapp?",
   "where are we?", "crawl this site") crawls the platform's OWN public site
   (`asksAboutThisPlatform` + `buildSelfInspectIntent`, wired in `runResearchForIntent`),
   so the answer can come from the fetched pages. It is gated like every web action by
   `hasResearchAccess`; without the unlock the model still answers from the block.
   This EXTENDS rule 41 item 3 (see the second exception there): it opens only the
   platform's own `PUBLIC_SITE_URL`, never a page the user supplied.

## Not done here

- **The coding-agent extension.** It lives in its own repository and builds its own
  prompts. A separate change must add the same block there (source of truth: this
  constant). Agent turns that run through `ContextAssemblyManager` (Runtime V2) already
  carry it.
- **`ChatExecutionManager.generateOnce`** (`POST /internal/chat/generate`, used by
  workspace AI actions such as summarising a Jira issue) sends a caller-supplied
  `[system, user]` pair and does NOT carry the block: those are task prompts, not chat.
- Judge and verifier personas are appended to an assembled context, so they DO carry it;
  only `generateOnce`-style task helpers do not.

## Consequences

- Every request carries about 330 more prompt tokens (about 1,300 characters), billed to
  the user's allowance.
- The block states no price, limit or plan figure (a spec asserts it), so it cannot go
  stale when an admin edits a plan.
- A model that ignores the instruction can still say "as a memory"; the layer is guidance,
  not an enforcement, and nothing in it is stored to be shown.

## What would make this stale

A prompt path that assembles a system message without `buildPlatformIdentityBlock`; the
block being copied into memory-service, a receipt, a response body or the preview panel;
or a plan price written into the block text.
