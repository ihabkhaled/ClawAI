# Change - Security incident 2026-11-27: internal surfaces, sign-up abuse defences, edge limits

## Files

- `.env.example`
- `apps/claw-agent-service/src/app/__tests__/`
- `apps/claw-agent-service/src/modules/agent/controllers/`
- `apps/claw-agent-service/src/modules/agent/controllers/__tests__/`
- `apps/claw-auth-service/`
- `apps/claw-auth-service/prisma/`
- `apps/claw-auth-service/prisma/migrations/20261127120000_anti_abuse_user_devices/`
- `apps/claw-auth-service/src/`
- `apps/claw-auth-service/src/app/config/`
- `apps/claw-auth-service/src/app/filters/`
- `apps/claw-auth-service/src/app/filters/__tests__/`
- `apps/claw-auth-service/src/app/filters/types/`
- `apps/claw-auth-service/src/common/types/`
- `apps/claw-auth-service/src/modules/anti-abuse/`
- `apps/claw-auth-service/src/modules/anti-abuse/adapters/`
- `apps/claw-auth-service/src/modules/anti-abuse/constants/`
- `apps/claw-auth-service/src/modules/anti-abuse/controllers/`
- `apps/claw-auth-service/src/modules/anti-abuse/controllers/__tests__/`
- `apps/claw-auth-service/src/modules/anti-abuse/dto/`
- `apps/claw-auth-service/src/modules/anti-abuse/dto/__tests__/`
- `apps/claw-auth-service/src/modules/anti-abuse/enums/`
- `apps/claw-auth-service/src/modules/anti-abuse/repositories/`
- `apps/claw-auth-service/src/modules/anti-abuse/repositories/__tests__/`
- `apps/claw-auth-service/src/modules/anti-abuse/schemas/`
- `apps/claw-auth-service/src/modules/anti-abuse/services/`
- `apps/claw-auth-service/src/modules/anti-abuse/services/__tests__/`
- `apps/claw-auth-service/src/modules/anti-abuse/types/`
- `apps/claw-auth-service/src/modules/anti-abuse/utilities/`
- `apps/claw-auth-service/src/modules/anti-abuse/utilities/__tests__/`
- `apps/claw-auth-service/src/modules/auth/`
- `apps/claw-auth-service/src/modules/auth/constants/`
- `apps/claw-auth-service/src/modules/auth/controllers/`
- `apps/claw-auth-service/src/modules/auth/controllers/__tests__/`
- `apps/claw-auth-service/src/modules/auth/dto/`
- `apps/claw-auth-service/src/modules/auth/enums/`
- `apps/claw-auth-service/src/modules/auth/managers/`
- `apps/claw-auth-service/src/modules/auth/managers/__tests__/`
- `apps/claw-auth-service/src/modules/auth/services/`
- `apps/claw-auth-service/src/modules/auth/services/__tests__/`
- `apps/claw-auth-service/src/modules/plans/__tests__/`
- `apps/claw-auth-service/src/modules/plans/repositories/`
- `apps/claw-auth-service/src/modules/plans/repositories/__tests__/`
- `apps/claw-auth-service/src/modules/system-settings/constants/`
- `apps/claw-auth-service/src/modules/system-settings/dto/`
- `apps/claw-auth-service/src/modules/system-settings/services/`
- `apps/claw-auth-service/src/modules/system-settings/services/__tests__/`
- `apps/claw-auth-service/src/modules/system-settings/types/`
- `apps/claw-auth-service/src/modules/system-settings/utilities/`
- `apps/claw-auth-service/src/modules/system-settings/utilities/__tests__/`
- `apps/claw-chat-service/`
- `apps/claw-chat-service/src/modules/chat-messages/controllers/`
- `apps/claw-chat-service/src/modules/chat-messages/controllers/__tests__/`
- `apps/claw-chat-service/src/modules/chat-messages/managers/`
- `apps/claw-chat-service/src/modules/chat-messages/managers/__tests__/`
- `apps/claw-chat-service/src/modules/chat-threads/controllers/`
- `apps/claw-chat-service/src/modules/chat-threads/controllers/__tests__/`
- `apps/claw-connector-service/`
- `apps/claw-connector-service/src/modules/connectors/controllers/`
- `apps/claw-connector-service/src/modules/connectors/controllers/__tests__/`
- `apps/claw-file-service/src/modules/files/clients/`
- `apps/claw-file-service/src/modules/files/clients/__tests__/`
- `apps/claw-file-service/src/modules/files/controllers/`
- `apps/claw-file-service/src/modules/files/dto/__tests__/`
- `apps/claw-frontend/`
- `apps/claw-frontend/public/workers/`
- `apps/claw-frontend/src/app/(portal)/admin/security/sign-up/`
- `apps/claw-frontend/src/app/(portal)/admin/security/sign-up/__tests__/`
- `apps/claw-frontend/src/components/admin/`
- `apps/claw-frontend/src/components/admin/__tests__/`
- `apps/claw-frontend/src/components/admin/security/`
- `apps/claw-frontend/src/components/admin/user-linked-accounts/`
- `apps/claw-frontend/src/components/admin/user-linked-accounts/__tests__/`
- `apps/claw-frontend/src/components/auth/`
- `apps/claw-frontend/src/components/auth/__tests__/`
- `apps/claw-frontend/src/constants/`
- `apps/claw-frontend/src/enums/`
- `apps/claw-frontend/src/hooks/admin/`
- `apps/claw-frontend/src/hooks/auth/`
- `apps/claw-frontend/src/hooks/auth/__tests__/`
- `apps/claw-frontend/src/lib/bot-check/`
- `apps/claw-frontend/src/lib/bot-check/__tests__/`
- `apps/claw-frontend/src/lib/i18n/__tests__/`
- `apps/claw-frontend/src/lib/i18n/locales/`
- `apps/claw-frontend/src/lib/security/`
- `apps/claw-frontend/src/lib/security/__tests__/`
- `apps/claw-frontend/src/repositories/admin/`
- `apps/claw-frontend/src/repositories/auth/`
- `apps/claw-frontend/src/repositories/shared/`
- `apps/claw-frontend/src/services/admin/`
- `apps/claw-frontend/src/services/auth/`
- `apps/claw-frontend/src/services/auth/__tests__/`
- `apps/claw-frontend/src/types/`
- `apps/claw-frontend/src/utilities/`
- `apps/claw-frontend/src/utilities/__tests__/`
- `apps/claw-memory-service/`
- `apps/claw-memory-service/src/modules/embeddings/controllers/`
- `apps/claw-memory-service/src/modules/embeddings/controllers/__tests__/`
- `apps/claw-routing-service/src/modules/router-models/services/`
- `apps/claw-routing-service/src/modules/routing/__tests__/`
- `apps/claw-routing-service/src/modules/routing/services/`
- `apps/claw-routing-service/src/modules/routing/utilities/`
- `apps/claw-workspace-service/`
- `apps/claw-workspace-service/src/app/guards/`
- `apps/claw-workspace-service/src/app/guards/__tests__/`
- `apps/claw-workspace-service/src/common/utilities/`
- `apps/claw-workspace-service/src/modules/inbox/services/`
- `apps/claw-workspace-service/src/modules/inbox/services/__tests__/`
- `apps/claw-workspace-service/src/modules/ticket-planning/__tests__/`
- `apps/claw-workspace-service/src/modules/workspace/controllers/`
- `apps/claw-workspace-service/src/modules/workspace/controllers/__tests__/`
- `context/`
- `docker/`
- `docs/`
- `docs/04-backend/`
- `docs/05-frontend/`
- `docs/06-data/`
- `docs/08-runtime-devops/`
- `docs/11-runbooks/`
- `docs/13-adr/`
- `docs/14-risk-debt/`
- `docs/qa-evidence/`
- `docs/security/`
- `infra/nginx/`
- `rules/`
- `scripts/`
- `scripts/qa-lab/`
- `skills/`
- `tools/__tests__/`

## Before

Every production database, Redis (no password), MongoDB, RabbitMQ, ClamAV and the frontend were reachable from the
internet, and an attacker planted an SSH key through Redis (it failed). Internal service routes trusted any caller on
the Docker network. A bot farm signed up 113 throwaway accounts from rotating addresses and each got the free trial.

## Change

- Host (not in git, documented in the runbook): DOCKER-USER firewall, keys-only SSH, fail2ban for SSH and nginx, the
  113 farm accounts banned, the planted Redis key removed.
- Repo: production compose binds internal ports to loopback and gives Redis `requirepass` (`REDIS_PASSWORD`, installers
  generate it); nginx per-address budgets for sign-up, sign-in, bot-check and client logs plus a concurrent-connection
  cap; every internal controller requires the service token and every caller sends it (repo tests enforce both).
- auth-service (ADR-222): proof-of-work + Turnstile + reCAPTCHA v3 bot checks, disposable-email and MX refusal, device
  records (`user_devices`, migration `20261127120000_anti_abuse_user_devices`) with one trial per device, platform
  sign-up velocity limit, linked-accounts admin route, `security.*` settings (camelCase, clearable, secrets write-only),
  env fallbacks `TURNSTILE_*` / `RECAPTCHA_*`.
- frontend: bot checks and device fingerprint on sign-up and sign-in, refusal copy in 13 locales, Sign-up protection
  admin page, linked accounts in the user dialog, CSP for Turnstile and reCAPTCHA.

## Now

A script cannot sign up without solving the bot check; throwaway inboxes are refused; one device gets one trial; only
nginx 80/443 face the internet; internal routes prove their caller.

## Why

Owner report 2026-11-27 (random pending users, suspected hack) and decisions recorded in ADR-222.

## Verification

`docs/qa-evidence/2026-11-27-security-incident-anti-abuse.md`.

## What would make this stale

A new published port or service, a move behind a CDN, a change to the free-trial model, or a captcha provider change.
