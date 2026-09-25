> **Wiki source:** [`docs/01-executive-context/product-vision.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/01-executive-context/product-vision.md) on the current `main` branch. This page mirrors the repository documentation so the Wiki stays grounded in the codebase.

# Product Vision

> **Canonical home for ClawAI's positioning** — slogan, description, pillars,
> users and non-goals. Everything else links here: the README, the wiki,
> `CLAUDE.md` and every agent router. Decided in
> [ADR-126](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-126-every-ai-one-workspace-positioning.md) (2026-09-26);
> the change of direction is [DRIFT-001](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/drift-log.md).
> The flagship list, each traced to code, is
> [flagship-features.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/flagship-features.md).

## Every AI, one workspace.

**Every frontier AI model in one workspace that sees, hears, researches and
builds. Pay as you go, bring your team, or run it on your own hardware.**

_Replaced 2026-09-26: "Every Frontier AI Model, One Subscription"._

---

## Mission Statement

Put every capable AI model — cloud and local — behind one workspace where the
work actually happens: talk to it, show it files, audio and video, let it
research the web and write the documents, and pay only for what you use.

---

## The Four Pillars

| Pillar                      | Promise                                                                                                                                                                                                 | What makes it true                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **One workspace**           | Not a chat box: the AI sees images and video, hears voice notes, reads archives, researches and crawls the web, compares and orchestrates models, and writes PDF, Word, Excel, PowerPoint and Zip files | Flagships 1–8 and 10                                                                    |
| **Pay as you go**           | Connector credit metered per use across every surface, shown in the visitor's own currency                                                                                                              | Flagship 9; numbers in [`docs/business/`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/business/README.md)                        |
| **Bring your team**         | Admin-managed users, roles and permissions, plan grants, per-user usage, and coding agents an organisation can govern                                                                                   | Flagships 11–12, **with the gaps listed there** — no SSO and no shared team billing yet |
| **Local-first and private** | Run the whole stack on your own hardware, with Ollama, llama.cpp and local image models; virus-scanned uploads; retention and memory controls                                                           | Flagships 13–15                                                                         |

---

## Problem Being Solved

1. **One model is never enough, and switching is manual.** Each provider is
   strongest at something different; people keep several subscriptions and
   copy between tabs.
2. **Chat is too small for the work.** Real tasks arrive as voice notes, videos,
   zip files and links, and end as a spreadsheet, a deck or a PDF. Most assistants
   handle one end of that.
3. **Subscriptions charge for capacity, not use.** A light month costs the same
   as a heavy one, per seat, per provider.
4. **Privacy is all-or-nothing.** Either everything goes to a cloud API, or you
   run a local model with none of the tooling around it.
5. **Teams have no control plane.** No shared user management, usage view or
   audit trail across the AI tools people already use.

---

## Target Users

| User                                | Primary need                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Individual professionals**        | The best model for each task, files in and files out, paying only for what they use             |
| **Teams and business customers**    | Admin-managed users and roles, usage visibility, plan grants, governed coding agents            |
| **Developers**                      | A coding agent in VS Code, research that reads the docs for them, every provider behind one key |
| **Privacy-conscious organisations** | The whole stack on their own hardware, local models, verifiable routing                         |
| **Administrators and operators**    | Status, uptime, logs and metrics without shell access to production                             |

Personas in detail: [user-personas.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/user-personas.md).

---

## Value Proposition

### For a team or organisation

- **Every provider behind one workspace** — 22 usable providers, cloud and local,
  routed by task, modality and context window.
- **Pay for use** — metered credit instead of a seat per provider.
- **Control** — users, roles, permissions, plan grants, per-user statistics,
  audit trail, and an admin status page with Grafana and Prometheus behind it.
- **Your hardware if you want it** — one installer, GPU overlay chosen for you.

### For the individual

- **It hears and sees** — voice and video notes, images, PDFs, archives.
- **It researches** — an AI plans the web work, narrates each step, opens every
  link you paste, and crawls a site when asked.
- **It builds** — files written by the AI, named by the AI, in the format asked for.
- **It remembers** — memory, context packs and cross-thread context.
- **Power tools** — compare models with a judge, branch, edit and rerun, find in
  a conversation, read aloud.

---

## Product Goals

1. **The workspace is the product.** Every orchestration mode takes files and
   research; every model gets media it can use, or a helper that describes it.
2. **Every AI surface is metered, and every meter is honest.** Integer money,
   reservation before the call, settlement after
   ([rules/28](https://github.com/ihabkhaled/ClawAI/blob/main/rules/28-billing-integrity-and-api-contracts.md),
   [rules/37](https://github.com/ihabkhaled/ClawAI/blob/main/rules/37-payg-credit-integrity.md)).
3. **Routing picks a model that can actually do the task** — right modality,
   prompt fits the window, provider not out of credit.
4. **Self-hosted and portable.** The whole platform runs on one machine with
   Docker Compose; cloud providers are optional.
5. **Full operational visibility** — health, uptime, logs, metrics, audit.
6. **Localised in 13 languages**, including right-to-left.

### Non-Goals

1. **Training or fine-tuning models.** ClawAI orchestrates existing models.
2. **Replacing each provider's native product.** ClawAI is one workspace across
   providers, not a clone of any single one.
3. **Real-time collaborative editing** of a conversation.

_Removed 2026-09-26 because they are no longer true:_ "does not browse the web
or take actions" (it researches, crawls and runs a coding agent) and
"conversations are single-user, no sharing" (public share links exist).
Multi-tenant team accounts are **not** a non-goal — they are an open requirement
([REQ-POS-005](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/requirements-register.md#req-pos-005)).

---

## Success Metrics / KPIs

| Metric                    | Target                                          | How measured                           |
| ------------------------- | ----------------------------------------------- | -------------------------------------- |
| **Routing accuracy**      | ≥ 85% positive feedback on AUTO-routed messages | `ChatMessage.feedback` aggregation     |
| **System availability**   | 99.5%                                           | Status page (Prometheus-backed uptime) |
| **Metering completeness** | 100% of paid AI calls reserve and settle credit | PAYG ledger vs provider calls          |
| **Audit completeness**    | 100% of AI interactions have audit records      | Audit log count vs message count       |
| **Localisation coverage** | 100% of user-facing text in all 13 locales      | i18n key coverage                      |

_Unknown - ask the owner and record the answer._ — the commercial KPIs for the
repositioning (pay-as-you-go conversion, team-customer count, self-hosted
installs) have no targets yet.

---

## Competitive Positioning

| Dimension      | Typical AI assistant  | ClawAI                                                 |
| -------------- | --------------------- | ------------------------------------------------------ |
| **Models**     | One provider          | 22 usable providers, cloud and local                   |
| **Inputs**     | Text and some files   | Voice, video, images, PDFs, archives, links            |
| **Outputs**    | Text                  | Text, images, PDF, Word, Excel, PowerPoint, Zip        |
| **Web**        | Search snippets       | AI-planned research, narrated, robots-respecting crawl |
| **Pricing**    | Subscription per seat | Pay as you go, shown in your currency                  |
| **Deployment** | Their cloud           | Hosted, or the whole stack on your hardware            |
| **Control**    | Basic                 | Roles, permissions, plan grants, usage, status page    |

Market detail: [competitive-analysis.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/01-executive-context/competitive-analysis.md).
