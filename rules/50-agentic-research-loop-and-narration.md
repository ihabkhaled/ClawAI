# Rule 50 — The research loop: plan first, open what the user named, narrate everything

**Applies to**: chat-service's AUTO research path (`ResearchOrchestratorManager`,
`ResearchGateService.plan`), `NarrationService`, research-service's crawl, and
the frontend `NarrationLog`.

**Related**: [ADR-098](../docs/13-adr/adr-098-auto-research-is-an-ai-driven-narrated-loop.md) ·
[rules/41](41-web-evidence-truthfulness.md) · [rules/49](49-qa-team-discipline-and-test-evidence.md) ·
[skills/verify-the-research-loop-live.md](../skills/verify-the-research-loop-live.md)

---

## Mandatory

1. **One URL detector.** Anything that asks "does this text contain a link?"
   calls `detectUrlsInText` from `@claw/shared-utilities` (chat-service via
   `detectPromptUrls`). A second regex is how chat and research came to disagree
   about whether `example.com/pricing` was a URL. Never add a TLD to
   `BARE_HOST_TLDS` that is also an everyday identifier or file extension —
   those go in `BARE_HOST_TLDS_NEEDING_PATH`.
2. **Plan gate first.** In `runAutoResearch`, `hasResearchAccess` runs before
   the planner and before any URL shortcut. Crawl and research are both behind
   the plan's research unlock.
3. **A link the user wrote is opened.** `parseResearchPlan` overrules a planner
   that says "answer" or "search" when the user wrote a URL. Do not relax this
   to trust the model.
4. **An unusable planner reply returns `null`**, so the next configured model is
   tried. Never default a bad reply to an action — that ends the fallback walk.
5. **Research never runs inside the POST.** It runs after the response, and
   `publishMessageCreated` is in `finally`. Removing the `finally` leaves the UI
   waiting for an answer that never comes when research throws.
6. **Chat → research uses the internal route with the service token.** Never
   forward the user's bearer to `/research/runs` (admin-only) and never widen
   that route: research-service does not enforce the plan.
7. **Every step is narrated through `NarrationService.append`**, never by
   emitting a frame directly — the append is what stores it for after a
   refresh. A tick every replica receives passes a `dedupeKey`.
8. **Narration tells the truth.** Counts are what was READ (rule 41 §7); a
   failed step is `RESEARCH_FAILED`, never silence; the planner prompt requires
   its sentence to describe exactly the chosen action (a small model once
   copied an example sentence promising a search it never ran).

## Prohibited

- A URL regex outside `url-detection.utility.ts`.
- Forwarding a user token to research-service from chat.
- Awaiting the research loop inside `createMessage` before returning.
- Rendering the live log and the stored log with different components.

## Enforcement

| Mechanism | What it checks                                                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit      | `packages/shared-utilities/src/url-detection/__tests__/url-detection.utility.spec.ts` — bare domains, and every false-positive class (files, properties, versions, emails) |
| Unit      | `research-plan.utility.spec.ts` — null on unusable replies, user URLs never dropped, bounds                                                                                |
| Unit      | `research-gate.service.spec.ts` — the walk moves on after a bad reply; outage still crawls the user's link                                                                 |
| Unit      | `research-orchestrator.manager.spec.ts` — crawl → back to AI → search only when asked; failures narrated                                                                   |
| Unit      | `auto-research-resolution.spec.ts` — plan gate before everything, including a URL                                                                                          |
| Unit      | `research-progress-bridge.service.spec.ts` — one dedupe key per tick across replicas                                                                                       |
| Unit      | `research-client.utility.spec.ts` — internal route, service token, no user bearer                                                                                          |
| Live      | [skills/verify-the-research-loop-live.md](../skills/verify-the-research-loop-live.md)                                                                                      |
