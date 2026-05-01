# ADR-026 — User Automation Preferences: Most-Restrictive-Wins Intersection

**Status:** Accepted (2026-05-01)
**Stream:** 32

## Context

Stream 10 introduced `AiActionPolicy` rows that admins control globally — they decide which actions auto-approve, which deny, and which queue. Stream 32 introduces `UserAutomationPreference` rows that individual users own. The two sets need to compose without confusion.

Two failure modes were possible:

1. User pref *expands* what admin policy allows (e.g., user enables auto-approve where policy says PENDING_APPROVAL).
2. User pref *contradicts* admin policy in a way that surprises ops (audit shows DENIED but user expected approval).

## Decision

**Most-restrictive-wins.** Both layers are filters applied sequentially:

1. `AiActionPolicyMatcherManager` resolves the global decision first. Output: `AUTO_APPROVE | ALLOW | DENY`.
2. `AiActionApprovalManager.applyUserPreference()` then refines:
   - Policy `DENIED` → stays `DENIED`. User pref **cannot loosen** admin guardrails.
   - User `isEnabled=false` → forces `DENIED`. (User-level kill switch.)
   - Policy `AUTO_APPROVED` but user's `autoApproveBelowRiskScore < risk.riskScore` → downgrade to `PENDING_APPROVAL`.
   - Otherwise: keep policy decision.

User can never auto-approve something the admin denied; admin can never auto-approve something the user explicitly disabled.

Storage: `UserAutomationPreference (userId, actionKind)` composite key. `providers` array narrows scope (e.g., enable for Jira but not Slack). `perDayBudget` enforced at Stream 12 dedup time (deferred to v1.x).

## Consequences

- Compliance teams have a strong story: user prefs cannot weaken admin policy.
- Power users can disable individual action kinds without touching global config.
- Risk service stays linear and auditable — one matcher, one refiner, no fixed-point recursion.

## Verification

- 7 unit tests in `ai-action-approval.manager.spec.ts` cover the full matrix:
  - Policy AUTO_APPROVED + no user pref → AUTO_APPROVED
  - Policy AUTO_APPROVED + user disabled → DENIED
  - Policy AUTO_APPROVED + user threshold < risk → PENDING_APPROVAL
  - Policy DENIED + user enabled with high threshold → still DENIED
  - Policy PENDING + no user pref → PENDING
- All pass on first run (`npx jest src/modules/ai-actions/managers/__tests__/ai-action-approval.manager.spec.ts` → 7/7).
