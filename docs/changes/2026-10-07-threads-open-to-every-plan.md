# Threads open to every plan (2026-10-07)

**Why.** Owner decision: Threads must be allowed on Free, paid plans and for administrators. The local and production plan rows for Free, Starter and Plus had Research, Judge and Critic DISABLED, so only Pro and above could create one even though the plan catalog already gave them a limit.

**What.**

- auth-service migration `20261007120000_threads_allowed_on_every_plan`: sets the three Threads rules on Free (1 for life), Starter (2 a month, Critic 1) and Plus (10 a month, Critic 5). Only a rule still DISABLED is changed, so an edited limit is never overwritten. Only `plan_feature_rules` moves; chat's Research, Judge and Critic gates read `plans.allow_*` and are untouched.
- frontend: the plan-blocked message now covers both "not in your plan" and "allowance used up", in 13 locales (a Free user's second Thread returns the same 403 as a plan without Threads).

**Not decided here.** Free users consume credit-connector requests when a Thread runs; a Thread makes many model calls, so the Free allowance of 10 requests a month will run out mid-run. The credit meter and expensive-model guard (next batch) is what bounds that cost.

## Code paths traced

apps/claw-auth-service/prisma/migrations/20261007120000_threads_allowed_on_every_plan/migration.sql
apps/claw-auth-service/prisma/seeders/**tests**/threads-plan-access.migration.spec.ts
apps/claw-auth-service/src/modules/credit/services/thread-job-budget.service.ts
