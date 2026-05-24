# ClawAgent V2 — Business Roadmap, Positioning, Monetization

> Owner: Desktop Agent V2 Stream 13
> Added: 2026-05-24
> Status: Working draft — supersedes the v1 roadmap notes in
> `desktop-agent-vision.md`

## Where this fits in ClawAI

ClawAI today is a web-first AI workspace: chat threads, recipes,
memory, marketplace, fleet admin. The Desktop Agent extends that
workspace to the OS — files, processes, browser, screen, clipboard,
audio, applications. The pitch: **ClawAI is the only AI workspace
where every action across the web AND the desktop runs through the
same approval queue, the same audit ledger, the same recipe DSL.**

V2 of the Desktop Agent closes the gap between "we shipped 9
capability providers" (V1, 2026-05-07) and "you can hand the
desktop agent to a finance team and not have a compliance review
block adoption" (V2, target: Q3 2026).

## Target personas

| Persona                 | Why they need ClawAgent                                                 | What they pay for              |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| **Solo developer**      | One-click recipes that browse + scrape + write code + commit            | Free tier (rate-limited)       |
| **Power user / analyst**| Custom recipes that pull from Slack + Drive + the local filesystem      | Pro tier ($20/mo per device)   |
| **Small team lead**     | Marketplace of vetted recipes + per-org policies + activity dashboard   | Team tier ($50/mo per device)  |
| **Enterprise IT**       | SSO + device fleet matrix + cross-OS evidence + signed auto-updates     | Enterprise tier (annual SOW)   |

## Roadmap (post-V2)

### Q3 2026 — V2 release

- All 9 capability providers cross-OS validated with evidence files
- Marketplace publisher portal live (Stream 06 V2)
- Tauri shell auto-update + signed bundles (Stream 04 V2 + Stream 10 V2)
- Activity-driven suggestions (Stream 05 V2)
- Dual-write retired (Stream 01 V2 — soak window + flag flip)

### Q4 2026 — V2.1 polish

- Recipe visual builder UI (deferred from V2 Stream 03 — needs
  ~3 weeks of dedicated UI work, blocked on the V2 release)
- Per-record cloud-sync opt-in UI for activity memory
- Production-IdP integrations for Okta + Entra + Auth0 (test tenants
  needed; defers V1 Stream 07 to validate)
- Tauri auto-installer for native dependencies (Playwright, nut-tree,
  whisper-cpp, tesseract) — single button in the welcome screen

### Q1 2027 — V3 directions (proposals)

- **Multi-account context switcher** — same machine, multiple ClawAI
  workspaces, per-account capability queues. Required for consultants
  + parents on shared machines.
- **Agent-to-agent recipe imports** — sandbox a recipe from another
  user without going through the marketplace (link-share with sandbox
  re-verification per install).
- **Local-LLM-first recipes** — recipes that target the user's local
  Ollama/llama.cpp models instead of cloud (privacy-first vertical).
- **iOS/Android companion** — view + approve capabilities from a
  phone. The approval flow is small enough to mobile-port; the
  capability execution stays on the desktop.

## Monetization model

ClawAgent itself is bundled into existing ClawAI subscription tiers
(no separate price). The Pro/Team/Enterprise tiers differ by:

| Limit / feature               | Free  | Pro    | Team    | Enterprise |
| ----------------------------- | :---: | :----: | :-----: | :--------: |
| Paired devices per user       |   1   |   3    |   10    | unlimited  |
| Capability invocations / day  |  100  | 5,000  | 50,000  | unlimited  |
| Cloud sync of activity-memory |   ✖   |   ✔    |    ✔    |     ✔      |
| Marketplace installs          |   3   |   ∞    |    ∞    |     ∞      |
| Org-scoped policies           |   ✖   |   ✖    |    ✔    |     ✔      |
| SAML SSO                      |   ✖   |   ✖    |    ✔    |     ✔      |
| Device fleet matrix UI        |   ✖   |   ✖    |    ✔    |     ✔      |
| Signed auto-updates           |   ✔   |   ✔    |    ✔    |     ✔      |
| Cross-OS evidence in support  |   ✖   |   ✖    |    ✖    |     ✔      |
| Custom HARD_DENYLIST entries  |   ✖   |   ✖    |    ✖    |     ✔      |
| Priority support / SLA        |   ✖   |   ✖    |    ✔    |     ✔      |

Rate-limits enforced via the existing `@nestjs/throttler` per-tier
config; daily invocation cap enforced by a new sweeper (deferred to
V2.1).

## Competitive positioning

**vs Zapier / Make / n8n** — those tools route events between cloud
services. ClawAgent routes events on the user's local machine. The
desktop is their dead zone; it's our home turf.

**vs OS-level AI shells (Apple Intelligence, Copilot, Gemini Nano)** —
those are single-vendor, tied to one OS, locked to one model. ClawAgent
is multi-OS, multi-model (cloud + local Ollama + llama.cpp), and
exposes the same approval queue across all three OSes.

**vs Open-Interpreter / Auto-GPT / SmolDevs** — those are CLI-first
LLM scratchpads. ClawAgent is a governed runtime: every action goes
through a typed capability, an approval queue, an audit ledger, and a
hard denylist. No "yolo run anything the model emits".

## "Why now" wedge

LLMs that can drive computers became mainstream in 2025. Every
desktop agent shipped so far has either:

1. Run as root with no approval gate (Open-Interpreter, AutoGPT) — too
   dangerous for production teams, AND
2. Been locked into a single vendor OS (Apple, Microsoft) — no
   cross-machine portability.

ClawAgent solves both. The approval framework + capability typing +
hard denylist gives security teams something they can sign off on.
The cross-OS evidence requirement gives enterprise IT something they
can ship across heterogeneous fleets.

## Success metrics

| Metric                                         | V2 target          |
| ---------------------------------------------- | ------------------ |
| WAU paired devices per Pro subscriber          | 1.5                |
| Marketplace installs per active recipe         | 4.0                |
| Activity-suggestion accept rate                | 25%                |
| % capability invocations auto-approved         | 70%                |
| % capability invocations denied by hard list   | < 0.1%             |
| Median time-to-first-capability after install  | < 5 minutes        |
| Cross-OS evidence coverage at stable promotion | 100%               |
| Mean time-to-rollback after bad release        | < 30 minutes       |

## Risks + open questions

- **Provider native-binding bundling** — Playwright, nut-tree,
  whisper-cli are ~250 MB combined. Bundling them into the Tauri
  installer balloons download size; lazy-install adds first-use
  latency. V2 ships lazy-install; V2.1 should ship an "install all"
  flow in the welcome screen.
- **Audit log volume** — every capability invocation produces 2-4
  audit rows. Pro-tier ceilings = ~20K rows/day per user, which is
  fine in Mongo for ~5 years before storage pressure. Enterprise
  tier needs offline-archive (Glacier) flow.
- **Cross-OS QA cost** — every release requires running the cross-OS
  smoke on three OSes. V2 plans for maintainer-owned VMs (Parallels
  on M-series Macs); V2.1 should evaluate moving to GitHub-hosted
  matrix runners.

## See also

- `docs/02-business-product/desktop-agent-vision.md`
- `docs/02-business-product/desktop-agent-feature-catalog.md`
- `docs/10-uat-acceptance/desktop-agent-uat.md`
- `docs/11-runbooks/runbook-desktop-agent-release-channels.md`
- `plan-prompts/ClawAI_desktop_agent_v2_flagship_pack/13_business_roadmap_and_market_positioning.md`
