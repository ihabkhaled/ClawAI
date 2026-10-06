# Change - Serialize production Compose build work

## Files

- `scripts/deploy-prod.sh` (M)
- `tools/__tests__/deploy-prod.test.mjs` (M)
- `tools/__tests__/deploy-prod-e2e.sh` (M)
- `docs/11-runbooks/runbook-server-overloaded-by-builds.md` (M)
- `docs/qa-evidence/2026-10-05-threads-public-discovery.md` (M)
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md` (M)

## Before

Production's 19-service deployment called Compose once for every changed image.
Setting `COMPOSE_PARALLEL_LIMIT=1` and passing Compose's explicit `--parallel`
option still let BuildKit schedule the full target graph together. The 8-core
host reached 22 blocked tasks, full swap, and 2.5 GiB available during the
v1.194.2 build.

## Change

Pass Compose's explicit `--parallel` limit and build one planned service per
Compose invocation. The service loop shares the existing one-hour build
deadline and retries transient network errors only for the service that failed.
Default to parallelism 1 for manual and automatic releases. Add regression
assertions, update the rehearsal's Docker stub to consume the global option,
and record the behavior in the existing build-overload runbook, implementation
plan, and Threads QA evidence.

## Now

The script regression suite passes (42 passed, 1 platform-only rehearsal
skipped on Windows); the WSL Ubuntu end-to-end rehearsal passes 131/131,
including one target per Compose build invocation. Shell syntax passes.
Production remains on SHA
`0ff0c059ce9b444a9af7f63721edabc57963eba8`; the rollout has not yet completed.

## Why

Compose still scheduled all requested service targets together, even with the
explicit parallel limit. A separate invocation per service enforces the
resource boundary that the host needs while preserving one shared deadline.

## Who and intent

The owner authorized the production rollout and asked for careful deployment.
Intent: prevent another resource-exhausting build while deploying the Threads
release.

## Alternatives

Cancel every deployment that changes many services, or rebuild images manually
outside the guarded deployment script. Both leave the default path exposed to
the same scheduling behavior.

## Verification and stale condition

Verified with `node --test tools/__tests__/deploy-prod.test.mjs` (42 passed,
1 skipped on Windows), `bash -n scripts/deploy-prod.sh`, and the WSL Ubuntu
deployment rehearsal (131 passed). CI `37502613096` passed 116/116, AI-native OS
`37502613191` passed, and CodeQL `37502613641` passed for `83ffb1c`. The v1.194.2
deployment was cancelled during build before container recreation. This record
is stale if the production build command, service graph, or rollout changes.

knowledge delta: documented the production concurrency finding and remediation
in this change record, the existing overload runbook, rollout plan, and QA
evidence. No skill or rule was added because the existing deployment script,
resource rule, and overload runbook own this operation.
