# Policy checks remain advisory for releases

Date: 2026-10-25

## Before

The `policy` job was required by `ci-success`. Its audit step failed on vulnerable
`multer` 2.4.0, and any future formatting, ratchet, audit, or actionlint failure
also made the complete `CI` workflow fail. `release.yml` only publishes after a
successful `CI` workflow, so that policy job could stop releases.

## Change

- `.github/workflows/ci.yml`: set the Policy and `ai-native-os` jobs to
  `continue-on-error: true` and remove both from `ci-success.needs`; required
  product, security, and release gates remain blocking.
- `.github/workflows/ai-native-os.yml` and `.github/pull_request_template.md`:
  correct their descriptions of the release gate.
- `package.json` and `package-lock.json`: update the multer override to patched
  version 2.5.0.
- `context/stack-and-toolchain.md`: document the root override and its audit.
- `tools/__tests__/ai-native-workflow.test.mjs`: assert that Policy and
  `ai-native-os` are advisory.
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

GitHub reports Policy and `ai-native-os` failures as tolerated; the `CI` workflow
and release gate can succeed when the required aggregate passes. The current
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

## Paths in this change

- `.github/workflows/ci.yml`
- `.github/workflows/ai-native-os.yml`
- `.github/pull_request_template.md`
- `package.json`
- `package-lock.json`
- `context/stack-and-toolchain.md`
- `tools/__tests__/ai-native-workflow.test.mjs`
- `docs/08-runtime-devops/ci-cd-pipeline.md`
- `docs/qa-evidence/2026-10-25-policy-advisory.md`
- `docs/13-adr/adr-170-agents-md-is-the-canonical-router.md`
- `docs/wiki/index.md`
