# Frontend Architecture

The Next.js frontend currently contains **2933 tracked files** and **155 generated route records**.

## Major component domains
- `account`
- `admin`
- `adsense`
- `agent`
- `ai`
- `analytics`
- `audit`
- `auth`
- `automation-preferences`
- `billing`
- `chat`
- `chat-shares`
- `common`
- `connector-grants`
- `connectors`
- `context-packs`
- `dashboard`
- `devices`
- `digest`
- `discovery`
- `email-signatures`
- `email-templates`
- `feedback`
- `file-viewer`
- `files`
- `impl-handoff`
- `inbox`
- `layout`
- `local-frontier`
- `logs`
- `marketing`
- `memory`
- `models`
- `observability`
- `research`
- `routing`
- `search`
- `settings`
- `ui`
- `workspace`
- `workspace-chains`
- `workspace-providers`

## Key layers
- `src/app/` — App Router pages/layouts/API/discovery endpoints.
- `src/components/` — product-domain and shared UI.
- `src/lib/` — HTTP, i18n, analytics, SEO, pricing/display-currency, markdown, security, validation and runtime-progress infrastructure.
- frontend tests + Playwright lanes.

Canonical references: [context/frontend-architecture.md](https://github.com/ihabkhaled/ClawAI/blob/main/context/frontend-architecture.md) · [docs/05-frontend/](https://github.com/ihabkhaled/ClawAI/blob/main/docs/05-frontend) · [rules/03-frontend-rules.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/03-frontend-rules.md) · [rules/04-nextjs-app-router.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/04-nextjs-app-router.md).
