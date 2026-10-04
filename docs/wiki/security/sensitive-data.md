# Sensitive data

<!-- akinator:generated:begin -->

## Sensitive data register

Names and locations only - this page never holds a value.

### Secret-bearing environment variables

- `ADMIN_PASSWORD` - declared in `.env.example`
- `ADMIN_TOKEN` - declared in `qa/routing-regression/README.md`
- `BITBUCKET_WEBHOOK_SECRET` - declared in `.env.example`
- `BULL_AUTH_KEY` - declared in `docker/docker-compose.dev.services.yml`, `docker/docker-compose.prod.services.yml`
- `CONTEXT_TOKEN_ESTIMATOR_MODE` - declared in `.env.example`
- `CRAWL4AI_API_TOKEN` - declared in `.env.example`, `docker/docker-compose.dev.services.yml`, `docker/docker-compose.prod.services.yml`
- `ENCRYPTION_KEY` - declared in `.env.example`, `.github/workflows/ci.yml`
- `FIGMA_WEBHOOK_SECRET` - declared in `.env.example`
- `FIRECRAWL_BULL_AUTH_KEY` - declared in `.env.example`, `docker/docker-compose.dev.services.yml`, `docker/docker-compose.prod.services.yml`
- `FIRECRAWL_POSTGRES_PASSWORD` - declared in `.env.example`, `docker/docker-compose.dev.services.yml`, `docker/docker-compose.prod.services.yml`
- `GF_SECURITY_SECRET_KEY` - declared in `docker/docker-compose.dev.services.yml`, `docker/docker-compose.prod.services.yml`
- `GH_TOKEN` - declared in `.github/workflows/publish-wiki.yml`, `.github/workflows/release.yml`
- `GITHUB_CLIENT_SECRET` - declared in `.env.example`
- `GITHUB_DEPLOY_TOKEN` - declared in `.env.example`
- `GITHUB_WEBHOOK_SECRET` - declared in `.env.example`
- `GITLAB_WEBHOOK_SECRET` - declared in `.env.example`
- `GOOGLE_CLIENT_SECRET` - declared in `.env.example`
- `GOOGLE_CLOUD_VISION_API_KEY` - declared in `.env.example`
- `GRAFANA_SECRET_KEY` - declared in `.env.example`, `docker/docker-compose.dev.services.yml`, `docker/docker-compose.prod.services.yml`
- `HTTPS_KEY_PATH` - declared in `.env.example`
- `HUGGINGFACE_TOKEN` - declared in `.env.example`
- `INDEXNOW_KEY` - declared in `.github/workflows/deploy-production.yml`
- `INTER_SERVICE_AUTH_TOKEN` - declared in `.env.example`, `.github/workflows/lighthouse.yml`
- `JIRA_CLIENT_SECRET` - declared in `.env.example`
- `JIRA_WEBHOOK_SECRET` - declared in `.env.example`
- `JWT_SECRET` - declared in `.env.example`, `.github/workflows/ci.yml`
- `MONGO_INITDB_ROOT_PASSWORD` - declared in `docker/docker-compose.dev.databases.yml`, `docker/docker-compose.prod.databases.yml`
- `MONGO_PASSWORD` - declared in `.env.example`, `docker/docker-compose.dev.databases.yml`, `docker/docker-compose.prod.databases.yml`
- `NEXT_PUBLIC_PAYMOB_PUBLIC_KEY` - declared in `.env.example`
- `OLLAMA_API_KEY` - declared in `.env.example`
- `PAYMENT_TOKEN_ENCRYPTION_KEY` - declared in `.env.example`, `.github/workflows/ci.yml`
- `PAYMENT_TOKEN_KEY_VERSION` - declared in `.env.example`
- `PAYMOB_API_KEY` - declared in `.env.example`
- `PAYMOB_HMAC_SECRET` - declared in `.env.example`
- `PAYMOB_PUBLIC_KEY` - declared in `.env.example`
- `PAYMOB_SECRET_KEY` - declared in `.env.example`
- `PAYPAL_CLIENT_SECRET` - declared in `.env.example`
- `PG_AGENT_PASSWORD` - declared in `.env.example`, `docker/docker-compose.dev.databases.yml`, `docker/docker-compose.prod.databases.yml`
- `PG_AUTH_DB` - declared in `.env.example`, `docker/docker-compose.dev.databases.yml`, `docker/docker-compose.prod.databases.yml`
- `PG_AUTH_PASSWORD` - declared in `.env.example`, `docker/docker-compose.dev.databases.yml`, `docker/docker-compose.prod.databases.yml`
- ... and 26 more

### Secret-bearing files

| File                                                                          | Tracked | Gitignored | Severity |
| ----------------------------------------------------------------------------- | ------- | ---------- | -------- |
| `.claude/worktrees/agent-a457c98a264467b5b/infra/nginx/.env.distributed`      | no      | yes        | ok       |
| `.claude/worktrees/agent-a89078518adbd7ef1/infra/nginx/.env.distributed`      | no      | yes        | ok       |
| `.env`                                                                        | no      | yes        | ok       |
| `.env.vercel`                                                                 | no      | yes        | ok       |
| `.worktrees/backend-defects/infra/nginx/.env.distributed`                     | no      | yes        | ok       |
| `.worktrees/chat-bugs/infra/nginx/.env.distributed`                           | no      | yes        | ok       |
| `.worktrees/chat-supremacy/infra/nginx/.env.distributed`                      | no      | yes        | ok       |
| `.worktrees/coding-agent-chats/infra/nginx/.env.distributed`                  | no      | yes        | ok       |
| `.worktrees/f093/infra/nginx/.env.distributed`                                | no      | yes        | ok       |
| `.worktrees/f097/infra/nginx/.env.distributed`                                | no      | yes        | ok       |
| `.worktrees/f099s2/infra/nginx/.env.distributed`                              | no      | yes        | ok       |
| `.worktrees/f100/infra/nginx/.env.distributed`                                | no      | yes        | ok       |
| `.worktrees/f108/infra/nginx/.env.distributed`                                | no      | yes        | ok       |
| `.worktrees/frontend-plan-ux/infra/nginx/.env.distributed`                    | no      | yes        | ok       |
| `.worktrees/global-app-version/infra/nginx/.env.distributed`                  | no      | yes        | ok       |
| `.worktrees/leak-probe/infra/nginx/.env.distributed`                          | no      | yes        | ok       |
| `.worktrees/m1-stop/infra/nginx/.env.distributed`                             | no      | yes        | ok       |
| `.worktrees/m2-prompt-ui/infra/nginx/.env.distributed`                        | no      | yes        | ok       |
| `.worktrees/m3-prompt-api/infra/nginx/.env.distributed`                       | no      | yes        | ok       |
| `.worktrees/m4-thread-create/infra/nginx/.env.distributed`                    | no      | yes        | ok       |
| `.worktrees/m5-selfcrawl/infra/nginx/.env.distributed`                        | no      | yes        | ok       |
| `.worktrees/m6-pdf-low/infra/nginx/.env.distributed`                          | no      | yes        | ok       |
| `.worktrees/memory-flag/infra/nginx/.env.distributed`                         | no      | yes        | ok       |
| `.worktrees/mobile-ui-revamp/.env`                                            | no      | yes        | ok       |
| `.worktrees/mobile-ui-revamp/certs/claw.key`                                  | no      | yes        | ok       |
| `.worktrees/mobile-ui-revamp/certs/rootCA.pem`                                | no      | yes        | ok       |
| `.worktrees/mobile-ui-revamp/infra/nginx/.env.distributed`                    | no      | yes        | ok       |
| `.worktrees/multimodal-orchestration/.env`                                    | no      | yes        | ok       |
| `.worktrees/multimodal-orchestration/infra/nginx/.env.distributed`            | no      | yes        | ok       |
| `.worktrees/parity-backend/infra/nginx/.env.distributed`                      | no      | yes        | ok       |
| `.worktrees/parity-safe/infra/nginx/.env.distributed`                         | no      | yes        | ok       |
| `.worktrees/prompt-followups/infra/nginx/.env.distributed`                    | no      | yes        | ok       |
| `.worktrees/prompt-library/infra/nginx/.env.distributed`                      | no      | yes        | ok       |
| `.worktrees/research-metering/infra/nginx/.env.distributed`                   | no      | yes        | ok       |
| `.worktrees/runtime-managed-connector-providers/infra/nginx/.env.distributed` | no      | yes        | ok       |
| `.worktrees/workspace-automation/infra/nginx/.env.distributed`                | no      | yes        | ok       |
| `.worktrees/x10/infra/nginx/.env.distributed`                                 | no      | yes        | ok       |
| `.worktrees/z1/infra/nginx/.env.distributed`                                  | no      | yes        | ok       |
| `.worktrees/z3/infra/nginx/.env.distributed`                                  | no      | yes        | ok       |
| `.worktrees/z4/infra/nginx/.env.distributed`                                  | no      | yes        | ok       |

- ... and 3 more

### PII-ish and credential fields in schemas

- `apps/claw-agent-service/prisma/migrations/20260421000000_phase_a_device_model_and_refresh/migration.sql:44` `tokenHash` - credential
- `apps/claw-agent-service/prisma/migrations/20260930130000_add_prompt_routines_and_runner_credentials/migration.sql:27` `tokenHash` - credential
- `apps/claw-agent-service/prisma/migrations/20260930130000_add_prompt_routines_and_runner_credentials/migration.sql:28` `tokenPrefix` - credential
- `apps/claw-agent-service/prisma/schema.prisma:302` `tokenClass` - credential
- `apps/claw-agent-service/prisma/schema.prisma:326` `tokenHash` - credential
- `apps/claw-agent-service/prisma/schema.prisma:448` `webhookSecretVersion` - credential
- `apps/claw-agent-service/prisma/schema.prisma:490` `tokenHash` - credential
- `apps/claw-agent-service/prisma/schema.prisma:491` `tokenPrefix` - credential
- `apps/claw-agent-service/src/modules/agent/dto/pair-approve.dto.ts:17` `tokenClass` - credential
- `apps/claw-agent-service/src/modules/agent/dto/refresh.dto.ts:6` `refreshToken` - credential
- `apps/claw-audit-service/src/modules/feedback/dto/__tests__/create-public-feedback.dto.spec.ts:8` `email` - PII
- `apps/claw-audit-service/src/modules/feedback/dto/create-public-feedback.dto.ts:40` `email` - PII
- `apps/claw-auth-service/prisma/migrations/20260404145320_init/migration.sql:10` `email` - PII
- `apps/claw-auth-service/prisma/migrations/20260404145320_init/migration.sql:12` `password_hash` - credential
- `apps/claw-auth-service/prisma/migrations/20260404145320_init/migration.sql:15` `must_change_password` - credential
- `apps/claw-auth-service/prisma/migrations/20260404145320_init/migration.sql:26` `refresh_token` - credential
- `apps/claw-auth-service/prisma/migrations/20260528193139_add_plans_quota/migration.sql:20` `daily_token_quota` - credential
- `apps/claw-auth-service/prisma/migrations/20260528193139_add_plans_quota/migration.sql:21` `monthly_token_quota` - credential
- `apps/claw-auth-service/prisma/migrations/20260528193139_add_plans_quota/migration.sql:49` `daily_token_limit_override` - credential
- `apps/claw-auth-service/prisma/migrations/20260809120000_add_password_reset_tokens/migration.sql:4` `token_hash` - credential
- `apps/claw-auth-service/prisma/migrations/20260812230000_super_admin_email_verification/migration.sql:7` `email_verified_at` - PII
- `apps/claw-auth-service/prisma/migrations/20260812230000_super_admin_email_verification/migration.sql:16` `token_hash` - credential
- `apps/claw-auth-service/prisma/migrations/20260813181000_reconcile_existing_super_admin/migration.sql:13` `email_verified_at` - PII
- `apps/claw-auth-service/prisma/migrations/20260818140000_add_email_change_requests/migration.sql:8` `new_email` - PII
- `apps/claw-auth-service/prisma/migrations/20260818140000_add_email_change_requests/migration.sql:10` `old_email_otp_hash` - PII
- `apps/claw-auth-service/prisma/migrations/20260818140000_add_email_change_requests/migration.sql:11` `old_email_otp_expires_at` - PII
- `apps/claw-auth-service/prisma/migrations/20260818140000_add_email_change_requests/migration.sql:12` `old_email_attempts` - PII
- `apps/claw-auth-service/prisma/migrations/20260818140000_add_email_change_requests/migration.sql:13` `old_email_verified_at` - PII
- `apps/claw-auth-service/prisma/migrations/20260818140000_add_email_change_requests/migration.sql:14` `new_email_token_hash` - PII
- `apps/claw-auth-service/prisma/migrations/20260818140000_add_email_change_requests/migration.sql:15` `new_email_expires_at` - PII
- `apps/claw-auth-service/prisma/migrations/20260820180000_apply_approved_free_plan_limits/migration.sql:6` `daily_token_quota` - credential
- `apps/claw-auth-service/prisma/migrations/20260820180000_apply_approved_free_plan_limits/migration.sql:7` `weekly_token_quota` - credential
- `apps/claw-auth-service/prisma/migrations/20260820180000_apply_approved_free_plan_limits/migration.sql:8` `monthly_token_quota` - credential
- `apps/claw-auth-service/prisma/migrations/20260822170000_add_deployment_credentials/migration.sql:9` `encrypted_token` - credential
- `apps/claw-auth-service/prisma/migrations/20260822170000_add_deployment_credentials/migration.sql:10` `token_last_four` - credential
- `apps/claw-auth-service/prisma/migrations/20260919120000_add_ops_access_tokens/migration.sql:5` `token_hash` - credential
- `apps/claw-auth-service/prisma/migrations/20260919120000_add_ops_access_tokens/migration.sql:6` `token_prefix` - credential
- `apps/claw-auth-service/prisma/schema.prisma:72` `email` - PII
- `apps/claw-auth-service/prisma/schema.prisma:74` `passwordHash` - credential
- `apps/claw-auth-service/prisma/schema.prisma:84` `emailVerifiedAt` - PII
- ... and 183 more

### Logging that mentions those fields

- `agent-cli/src/commands/start.command.js:193`
- `apps/claw-agent-service/src/modules/agent/managers/refresh-cleanup.manager.ts:19`
- `apps/claw-agent-service/src/modules/agent/services/routine-secret.service.ts:181`
- `apps/claw-auth-service/src/common/utilities/hashing.utility.ts:9`
- `apps/claw-auth-service/src/common/utilities/hashing.utility.ts:18`
- `apps/claw-auth-service/src/common/utilities/hashing.utility.ts:23`
- `apps/claw-auth-service/src/common/utilities/hashing.utility.ts:27`
- `apps/claw-auth-service/src/common/utilities/jwt.utility.ts:27`
- `apps/claw-auth-service/src/common/utilities/jwt.utility.ts:42`
- `apps/claw-auth-service/src/common/utilities/jwt.utility.ts:44`
- `apps/claw-auth-service/src/modules/auth/controllers/__tests__/auth.controller.spec.ts:80`
- `apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts:56`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts:318`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts:337`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts:346`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts:356`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts:369`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts:379`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts:389`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts:400`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts:410`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts:436`
- `apps/claw-auth-service/src/modules/auth/managers/auth.manager.ts:50`
- `apps/claw-auth-service/src/modules/auth/managers/auth.manager.ts:141`
- `apps/claw-auth-service/src/modules/auth/managers/auth.manager.ts:182`
- `apps/claw-auth-service/src/modules/auth/services/auth.service.ts:35`
- `apps/claw-auth-service/src/modules/auth/services/auth.service.ts:93`
- `apps/claw-auth-service/src/modules/auth/services/auth.service.ts:95`
- `apps/claw-auth-service/src/modules/auth/services/auth.service.ts:125`
- `apps/claw-auth-service/src/modules/auth/services/password-reset.service.ts:37`
- `apps/claw-auth-service/src/modules/deployment/adapters/github-actions.adapter.ts:253`
- `apps/claw-auth-service/src/modules/ops-tokens/services/ops-token.service.ts:51`
- `apps/claw-auth-service/src/modules/ops-tokens/services/ops-token.service.ts:64`
- `apps/claw-auth-service/src/modules/users/services/users.service.ts:376`
- `apps/claw-auth-service/src/modules/users/services/users.service.ts:405`
- `apps/claw-chat-service/src/modules/chat-messages/services/chat-messages.service.ts:596`
- `apps/claw-file-service/src/modules/files/services/archive-entries.service.ts:105`
- `apps/claw-frontend/src/hooks/chat/use-pin-thread.ts:15`
- `apps/claw-frontend/src/repositories/__tests__/auth.repository.test.ts:60`
- `apps/claw-frontend/src/services/__tests__/auth.service.test.ts:90`
- ... and 41 more

### Handling rules

| Class      | Default handling                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------- |
| credential | never log, never commit, encrypt at rest, redact in ledger, rotate on exposure                     |
| PII        | never log in clear, never commit real values, encrypt at rest, redact in ledger, delete on request |
| financial  | never log, never commit, encrypt at rest, redact in ledger, tokenise where possible                |
| health     | never log, never commit, encrypt at rest, redact in ledger, restrict access                        |

Regenerate with: `python <skill>/scripts/akinator_sensitive.py register --write`.
<!-- akinator:generated:end -->

## Who rotates each secret and how

Who rotates each secret and how: _Unknown - ask the owner and record the answer._

## Where secrets live in production

Where secrets live in production: _Unknown - ask the owner and record the answer._

## Who to tell after an exposure

Who to tell after an exposure: _Unknown - ask the owner and record the answer._
