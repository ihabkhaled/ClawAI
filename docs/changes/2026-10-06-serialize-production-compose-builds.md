# Change - Serialize production Compose build work

## Files

- `scripts/deploy-prod.sh` (M)
- `tools/__tests__/deploy-prod.test.mjs` (M)
- `docs/11-runbooks/runbook-server-overloaded-by-builds.md` (M)
- `docs/qa-evidence/2026-10-05-threads-public-discovery.md` (M)
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md` (M)

## Before

Production's 19-service deployment called Compose once for every changed image.
Setting `COMPOSE_PARALLEL_LIMIT=1` still let BuildKit schedule several service
targets together. The 8-core host reached 33 blocked tasks and 6.6 GiB of swap
use during image building.

## Change

Pass Compose's explicit `--parallel` limit to the bounded build command and set
the default to 1 for both manual and automatic releases. Add a focused
regression assertion and record the observed behavior in the existing
build-overload runbook, implementation plan, and Threads QA evidence.

## Now

The script regression suite passes (42 passed, 1 platform-only rehearsal
skipped), shell syntax passes, and production Compose accepts `--parallel 1`
while resolving all 41 configured services. No image build was started by that
read-only configuration check. Production remains on SHA
`0ff0c059ce9b444a9af7f63721edabc57963eba8`; the rollout has not yet completed.

## Why

The existing concurrency knob did not constrain the real multi-target Compose
build observed on the host. Explicitly passing the supported Compose option
turns the operator setting into an enforced limit.

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
1 skipped), `bash -n scripts/deploy-prod.sh`, and a remote `docker compose
--parallel 1 ... config --services` check (41 services). This record is stale if
the production build command, Compose parallelism behavior, or rollout changes.

knowledge delta: documented the production concurrency finding and remediation
in this change record, the existing overload runbook, rollout plan, and QA
evidence. No skill or rule was added because the existing deployment script,
resource rule, and overload runbook own this operation.
