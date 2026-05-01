# ClawAI Desktop Agent — Vision

## Executive Summary

ClawAI's desktop agent today (Phases A–D) covers device pairing, terminal-command approval, repo monitoring, and basic scheduling. The flagship initiative pushes the agent into the territory of **a true "operate-all-OS-work" assistant** — capable of reading any file, driving any browser, capturing any screen, manipulating clipboard and audio, automating any application via OS-native accessibility APIs, orchestrating multi-step recipes, and learning from user activity — with a hard policy + audit safety wall around every action.

The wedge: every other coding agent (Cursor, Codex CLI, Claude Code) lives in the editor. We live in the **whole desktop**. Every action is approval-gated, audited, undoable.

## Market Position

| Dimension | Cursor / Claude Code / Codex | ClawAI Desktop Agent (flagship) |
|---|---|---|
| Scope | Editor + repo | Whole OS (files / processes / browser / screen / clipboard / apps / audio) |
| Surface | Editor panel | System tray + global hotkey + command palette |
| Safety | Manual diff approval | Risk-policy engine + per-capability scopes + undo plans |
| Composition | Linear chat | Recipes (savable DAG of capability calls) |
| Memory | Session | Local-first activity memory + proactive suggestions |
| Enterprise | Per-seat license | Org fleet, M-of-N approvals, SAML/OIDC, forced versions |
| Distribution | App | App + community-published signed marketplace recipes |

The market gap we close: shops who want LLM-driven automation across email + calendar + files + apps without surrendering control to a black-box agent.

## Personas (Day-in-the-Life)

### Persona 1 — IC Engineer "Sam"
- **Day**: morning standup, code reviews, fixes bugs across 3 repos, deploys via gh-actions, end-of-day status update.
- **Pain**: context-switches between terminal, browser, Slack, Jira. Manual repetitive tasks (run dev server, check PR status, summarise discussion threads).
- **Wants**: one keystroke to run "open this PR + read latest comments + summarise + draft my reply"; recipes for daily morning ritual; safe shell-command execution with approval.

### Persona 2 — Consultant / Analyst "Maya"
- **Day**: pulls data from 4 dashboards, fills client deliverables in Word + Excel, summarises meetings, files expense reports, organises receipts.
- **Pain**: most work is filling forms + extracting data from screenshots + transcribing meetings; tools don't integrate.
- **Wants**: OCR a screenshot → AI summary; transcribe meeting → action items; recipe to "fill weekly status doc from these 5 sources."

### Persona 3 — Founder / Exec "Ravi"
- **Day**: emails, scheduled meetings, quick decisions, occasional digest reads.
- **Pain**: no time to triage; wants 80/20 on what matters; doesn't trust auto-actions on customer comms.
- **Wants**: morning brief recipe; "is anything urgent in my inbox?"; auto-organise downloads; never auto-send to a customer.

## Top-12 Use Cases (mapped to personas)

1. **Organise Downloads by file type** (Sam, Maya, Ravi) — fs.list + fs.move recipe
2. **Run dev server + tail logs** (Sam) — process.spawn + process.tail-output
3. **PR triage** (Sam) — browser.open GitHub + browser.extract-text + summarise + draft reply
4. **Daily morning brief** (all) — scheduled recipe: read email + Slack + calendar + summarise
5. **Form-fill from PDF** (Maya) — fs.read PDF + ocr + browser.fill
6. **Transcribe meeting** (Maya, Ravi) — audio.transcribe-file + summarise + memory write
7. **Fill expense report from receipts folder** (Maya) — fs.list + screen.ocr + browser.fill
8. **Find duplicates / clean up** (all) — fs.search-content + fs.diff + fs.delete-to-trash
9. **Backup of key folders** (all) — fs.move + scheduled recipe
10. **Screenshot + summarise dashboard** (Maya) — screen.capture-region + ocr + summarise
11. **Voice memo → searchable note** (Ravi) — audio.record + transcribe + memory store
12. **Cross-repo PR status** (Sam) — browser.extract-text on GitHub × N repos + summarise

## Out-of-Scope (v1 explicit non-goals)

- Mobile companion app (deferred v2)
- iOS / Android (desktop only)
- Voice-controlled palette (deferred v2)
- Cross-device handoff mid-recipe (deferred v2)
- Autonomous multi-step "do whatever you think is right" mode without approvals
- Recipe authoring via natural language alone (DSL editor primary, NL-to-DSL nice-to-have v2)

## Success Metrics (with targets)

### Leading
- Activation: 80% of installs complete pair + first-recipe within 1 day
- Engagement: 5+ approved capabilities per active user per day (median, week 4)
- Recipe usage: 3+ recipes saved per active user (week 4)
- Suggestion approval rate ≥70% (proxy for AI quality)

### Lagging
- Safety: 0 incidents per 1000 user-weeks (irreversible damage)
- Trust: 90% of users say "I trust the agent" in monthly NPS-style survey
- Retention: 60% MoM after first 30 days
- Marketplace: 50+ signed recipes by 6 months post-launch
- Enterprise: 5+ orgs with 20+ paired devices each by 6 months

## Risk Register (Top 12)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Filesystem write to wrong path | HIGH | CRITICAL | path-glob policies + symlink resolution + undo plan + dry-run preview |
| 2 | Process kill of system process | HIGH | HIGH | PID + binary-name + UID allow-list + DENY pid<100 |
| 3 | Browser auto-fill on phishing-lookalike domain | MED | HIGH | strict domain matching + per-action screenshot preview |
| 4 | Screen capture grabs background sensitive UI | HIGH | HIGH | per-app deny-list + recording indicator + zero-retention default |
| 5 | Clipboard read leaks credentials | MED | HIGH | secret-pattern redaction + history-not-stored on secret detection |
| 6 | App keystroke sent to wrong window | MED | HIGH | window-title verify + 200ms focus-stability check |
| 7 | Audio recording without consent | HIGH | MED | always-pending policy + audible indicator + length cap |
| 8 | Scheduled recipe runs at bad time | MED | MED | timezone-aware schedule + "device active" precondition |
| 9 | Marketplace recipe is malicious | HIGH | CRITICAL | static analysis + sandbox check + first-run approval + signed publishers + monthly rescan |
| 10 | Activity memory leaks PII to cloud | HIGH | HIGH | local-first + per-record opt-in + tcpdump verification |
| 11 | Bad fleet policy nukes 1000 devices | HIGH | HIGH | canary deployment 5%-then-ramp + instant rollback flag |
| 12 | Tray shell crash kills agent connectivity | MED | LOW | separate processes + watchdog + auto-restart |

## Roadmap (Waves with target dates — placeholder, adjust at planning)

| Wave | Streams | Target |
|---|---|---|
| Wave 0 — Strategy | 01, 02 | Week 1 |
| Wave 1 — Foundation | 10, 11, 12, 13 | Weeks 2-5 |
| Wave 2 — Capabilities | 20, 21, 22, 23, 24 | Weeks 6-10 (parallel) |
| Wave 3 — UX | 30, 31, 32 | Weeks 8-11 |
| Wave 4 — Enterprise + Intelligence | 40, 41, 42 | Weeks 12-17 |
| Continuous — QA + Docs | 50, 60 | Weeks 1-17 |
| Internal soak | n/a | Weeks 18-19 |
| Beta opt-in | n/a | Weeks 20-22 |
| GA | n/a | Week 23 |

## Pricing & Packaging

- **Free tier**: existing terminal-command flow + filesystem read + 1 saved recipe + 5 capabilities/day cap
- **Pro tier ($30/mo)**: all capability classes + unlimited recipes + activity memory + suggestion engine + marketplace install
- **Team tier ($60/seat/mo, min 5)**: org fleet + M-of-N approvals + SAML/OIDC + DLP integration + admin policy editor + audit export
- **Enterprise tier (custom)**: forced agent versions + SLA + on-premise deployment

## Glossary

See `00-MASTER-CONTEXT.md` glossary in the prompt pack.
