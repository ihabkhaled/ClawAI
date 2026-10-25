# Policy checks remain advisory for releases

Date: 2026-10-25

## Before

The `policy` job and `ai-native-os` caller were required by `ci-success`. The
Policy audit failed on vulnerable `multer` 2.4.0; failures in either job could
make the complete `CI` workflow fail. `release.yml` only publishes after a
successful `CI` workflow, so either job could stop releases.

## Change

- `.github/workflows/ci.yml`: set Policy to `continue-on-error: true` and remove
  it from `ci-success.needs`; required product, security, and release gates
  remain blocking.
- `.github/workflows/ai-native-os.yml` and `.github/pull_request_template.md`:
  run ai-native-os independently on pushes and pull requests, and correct the
  release-gate description.
- `package.json` and `package-lock.json`: update the multer override to patched
  version 2.5.0.
- `context/stack-and-toolchain.md`: document the root override and its audit.
- `tools/__tests__/ai-native-workflow.test.mjs`: assert that Policy is advisory
  and ai-native-os is an independent workflow.
- `docs/08-runtime-devops/ci-cd-pipeline.md`: document the release behavior.
- `docs/13-adr/adr-170-agents-md-is-the-canonical-router.md`: append the dated
  amendment to the earlier strict-gate decision.
- `docs/qa-evidence/2026-10-25-policy-advisory.md`: record scoped verification.

## Why

Policy and knowledge tooling findings should remain visible for follow-up, while
formatting ratchets, advisory audits, actionlint, knowledge, QA-evidence, and
tooling failures should not prevent release creation. Critical required CI jobs
still gate production releases.

## Operational effect

GitHub reports Policy failures as tolerated; the independent `ai-native-os`
workflow cannot affect the `CI` workflow or release conclusion. The current
production audit is clean with multer 2.5.0. This policy is inappropriate for
checks that must legally or operationally block production; such checks belong
in a required gate.

## Verification

- `node --test tools/__tests__/ai-native-workflow.test.mjs`: 7 passed.
- `node tools/security/npm-audit.mjs`: no unreviewed high/critical advisories.
- `npm run qa:evidence:check -- docs/qa-evidence/2026-10-25-policy-advisory.md`: passed.
- `npm run knowledge:verify`: passed before final wiki index regeneration.
- `npm run format:check`: passed; 760 existing legacy violations remain ratcheted.
- GitHub Actions checks are pending the push.

## CI correction

The first push produced an invalid workflow with no jobs because GitHub does
not allow `continue-on-error` on a reusable-workflow caller job. The caller was
removed; `ai-native-os.yml` now has its own push and pull-request triggers and
detects deploy paths itself. Policy remains a normal job with supported
`continue-on-error` behavior. The corrected workflow needs post-push CI
verification.

## CI follow-up fixes

CI exposed eight `unicorn/prefer-ternary` warnings after the ESLint plugin
upgrade and a React/React DOM mismatch that made frontend tests fail at module
load. The warnings were simplified without changing their decisions, and both
React packages now resolve to 19.3.1. Tests for the changed agent utilities and
frontend startup passed locally; the next CI run must confirm the full suites.

The follow-up CI run exposed additional `unicorn/prefer-ternary` warnings in
routing, payment, research, workspace, and shared packages. They were simplified
without changing branch decisions. Research tests also revealed that the lockfile
omitted Linkedom's `@acemir/cssom` dependency and coverage tried to parse generated
Prisma declarations; the dependency is now explicit and generated files are
excluded from coverage collection.

## Paths in this change

- `.github/workflows/ci.yml`
- `.github/workflows/ai-native-os.yml`
- `.github/pull_request_template.md`
- `package.json`
- `package-lock.json`
- `apps/claw-frontend/package.json`
- `context/stack-and-toolchain.md`
- `apps/claw-agent-service/src/common/utilities/policy-target-matcher.utility.ts`
- `apps/claw-agent-service/src/modules/agent/services/capability-dual-write-metrics.service.ts`
- `apps/claw-agent-service/src/modules/agent/services/command-risk.service.ts`
- `apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts`
- `apps/claw-chat-service/src/modules/chat-messages/managers/context-assembly.manager.ts`
- `apps/claw-chat-service/src/modules/chat-messages/services/context-save-proposal.service.ts`
- `apps/claw-chat-service/src/modules/chat-messages/services/message-speech.service.ts`
- `apps/claw-chat-service/src/modules/chat-messages/utilities/attachment-delivery.utility.ts`
- `apps/claw-chat-service/src/modules/chat-shares/utilities/safe-search-verdict.utility.ts`
- `apps/claw-chat-service/src/modules/chat-shares/utilities/snapshot-sanitizer.utility.ts`
- `apps/claw-chat-service/src/modules/chat-threads/__tests__/thread-settings-field-mapping.spec.ts`
- `apps/claw-payment-service/src/common/utilities/subscription-state-machine.utility.ts`
- `apps/claw-payment-service/src/modules/display-fx/services/display-fx.service.ts`
- `apps/claw-payment-service/src/modules/gateways/paymob/utilities/paymob-hmac.utility.ts`
- `apps/claw-research-service/package.json`
- `apps/claw-research-service/src/common/utilities/ip-address.utility.ts`
- `apps/claw-research-service/vitest.config.ts`
- `apps/claw-routing-service/src/modules/routing/managers/prompt-builder.manager.ts`
- `apps/claw-routing-service/src/modules/workflows/managers/live-workflow-selector.manager.ts`
- `apps/claw-workspace-service/src/modules/workspace/adapters/gmail-compose.helper.ts`
- `packages/shared-entitlements/src/entitlements-adapter.ts`
- `packages/shared-utilities/src/url-detection/url-detection.utility.ts`
- `tools/__tests__/ai-native-workflow.test.mjs`
- `docs/08-runtime-devops/ci-cd-pipeline.md`
- `docs/qa-evidence/2026-10-25-policy-advisory.md`
- `docs/13-adr/adr-170-agents-md-is-the-canonical-router.md`
- `docs/wiki/index.md`
