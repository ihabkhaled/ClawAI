# ClawAI Desktop Agent — Feature Catalog

> Source of truth for every feature the desktop-agent flagship will ship. Cross-referenced by every implementation stream prompt and by `docs/10-uat-acceptance/desktop-agent-uat.md`.

**Persona key**: IC = Sam (engineer), AN = Maya (analyst), EX = Ravi (exec), AD = Admin
**Sensitivity**: L=Low, M=Medium, H=High, C=Critical
**Blast radius**: NONE / SINGLE / MANY / USER / SYSTEM / EXTERNAL
**Reversibility**: REV / COMP / IRREV
**MoSCoW**: M=Must, S=Should, C=Could, W=Won't (v1)
**Effort**: S/M/L/XL
**Reuse**: R = extends existing, N = new
**Cross-OS test cost**: L=Linux only / M=2 OSes / H=3 OSes
**ADR/RB**: ADR / Runbook IDs (where applicable)

---

## Capability primitives

### Filesystem (stream 11)

| ID      | Name                 | Stream | Op               | User Story (one line)                                | Persona | Sens | Blast  | Rev   | MoSCoW | Effort | R/N                   | Cross-OS | Demo                                                                                     | ADR/RB                         |
| ------- | -------------------- | ------ | ---------------- | ---------------------------------------------------- | ------- | ---- | ------ | ----- | ------ | ------ | --------------------- | -------- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| F-FS-01 | Read file            | 11     | READ             | "I want the agent to read this PDF and summarise it" | AN, IC  | M    | NONE   | REV   | M      | S      | N                     | H        | open palette → "summarise this file" → pick path → AI summary in approval card           | ADR-030                        |
| F-FS-02 | Write file with undo | 11     | WRITE            | "Overwrite README with new content but let me undo"  | IC      | M    | SINGLE | COMP  | M      | S      | N                     | H        | trigger fs.write → see diff preview → approve → file written → click rollback → restored | ADR-030                        |
| F-FS-03 | Append to file       | 11     | APPEND           | "Append this log line to my journal"                 | EX      | L    | SINGLE | COMP  | M      | S      | N                     | H        | recipe writes to ~/journal.md daily                                                      | ADR-030                        |
| F-FS-04 | Move file with undo  | 11     | MOVE             | "Move this batch to Archive"                         | IC, AN  | M    | MANY   | COMP  | M      | S      | N                     | H        | bulk move 50 files → rollback restores original locations                                | ADR-030                        |
| F-FS-05 | Delete to trash      | 11     | DELETE           | "Delete these files (recoverable)"                   | all     | M    | SINGLE | COMP  | M      | S      | N                     | H        | delete → goes to OS trash → restore from trash                                           | ADR-030, RB-restore-from-trash |
| F-FS-06 | Permanent delete     | 11     | DELETE+permanent | "Permanently delete (no undo)"                       | all     | H    | SINGLE | IRREV | S      | S      | N                     | H        | always pending approval; banner shows IRREV                                              | ADR-030                        |
| F-FS-07 | Mkdir                | 11     | MKDIR            | "Create folder structure for new project"            | IC      | L    | SINGLE | REV   | M      | XS     | N                     | H        | recipe creates project scaffolding                                                       | —                              |
| F-FS-08 | List directory       | 11     | LIST             | "Show me everything in Downloads"                    | all     | L    | NONE   | REV   | M      | XS     | N                     | H        | palette command → table view                                                             | —                              |
| F-FS-09 | Stat file            | 11     | STAT             | "When was this file last modified?"                  | IC      | L    | NONE   | REV   | M      | XS     | N                     | H        | inspect step in recipe                                                                   | —                              |
| F-FS-10 | Watch path           | 11     | WATCH            | "Trigger recipe when file appears in Downloads"      | AN      | L    | NONE   | REV   | S      | M      | R (existing chokidar) | H        | drop file → recipe fires                                                                 | —                              |
| F-FS-11 | Search content       | 11     | SEARCH           | "Find every file containing 'TODO'"                  | IC      | L    | NONE   | REV   | M      | M      | N                     | H        | results paginated to 1000 max                                                            | —                              |
| F-FS-12 | Diff two files       | 11     | DIFF             | "Show me what changed"                               | IC      | L    | NONE   | REV   | S      | S      | N                     | H        | unified diff trimmed to 5000 lines                                                       | —                              |

### Process (stream 12)

| ID        | Name                        | Stream | Op          | Story                                   | Persona | Sens | Blast  | Rev   | MoSCoW | Effort | R/N | Cross-OS | Demo                              | ADR/RB                          |
| --------- | --------------------------- | ------ | ----------- | --------------------------------------- | ------- | ---- | ------ | ----- | ------ | ------ | --- | -------- | --------------------------------- | ------------------------------- |
| F-PROC-01 | Spawn process               | 12     | SPAWN       | "Start my dev server"                   | IC      | M    | SINGLE | COMP  | M      | M      | N   | H        | recipe starts node + tails output | ADR-031                         |
| F-PROC-02 | List running                | 12     | LIST        | "Show me what's running"                | IC      | L    | NONE   | REV   | M      | S      | N   | H        | palette command → table           | ADR-031                         |
| F-PROC-03 | Kill PID                    | 12     | KILL        | "Stop that runaway dev server"          | IC      | M    | SINGLE | IRREV | M      | S      | N   | H        | TERM → 5s grace → KILL            | ADR-031, RB-debug-stuck-process |
| F-PROC-04 | Send signal                 | 12     | SIGNAL      | "Reload nginx via HUP"                  | IC      | M    | SINGLE | IRREV | S      | S      | N   | H        | recipe sends SIGHUP               | —                               |
| F-PROC-05 | Set env for spawn           | 12     | SET_ENV     | "Spawn with NODE_ENV=test for this run" | IC      | L    | NONE   | REV   | S      | XS     | N   | H        | recipe param sets env             | —                               |
| F-PROC-06 | Tail managed-process output | 12     | TAIL_OUTPUT | "Stream stdout while it runs"           | IC      | L    | NONE   | REV   | M      | M      | N   | H        | SSE stream in approval card       | —                               |

### Browser (stream 20) — 14 ops, all **stream 20**, persona IC + AN

| ID      | Op                   | MoSCoW | Effort | Notes                              |
| ------- | -------------------- | ------ | ------ | ---------------------------------- |
| F-BR-01 | OPEN                 | M      | S      | new tab in isolated profile        |
| F-BR-02 | NAVIGATE             | M      | XS     | within open tab                    |
| F-BR-03 | CLICK                | M      | S      | requires target screenshot preview |
| F-BR-04 | FILL                 | M      | S      | preview before commit              |
| F-BR-05 | SCROLL               | S      | XS     |                                    |
| F-BR-06 | SCREENSHOT           | M      | XS     | base64 PNG, 60s TTL                |
| F-BR-07 | EXTRACT_TEXT         | M      | S      | DOM-aware                          |
| F-BR-08 | UPLOAD_FILE          | S      | M      | always pending                     |
| F-BR-09 | DOWNLOAD             | M      | S      | downloads to allow-globbed dir     |
| F-BR-10 | NETWORK_TRACE        | C      | M      | requires BROWSER_INTERCEPT scope   |
| F-BR-11 | INTERCEPT            | C      | L      | requires BROWSER_INTERCEPT scope   |
| F-BR-12 | COOKIE_READ          | S      | S      | redacted by default                |
| F-BR-13 | COOKIE_CLEAR         | S      | XS     | always pending                     |
| F-BR-14 | SESSION_SAVE/RESTORE | M      | M      | encrypted storageState             |

### Screen (stream 21) — 8 ops

| ID       | Op              | MoSCoW | Effort | Notes                                    |
| -------- | --------------- | ------ | ------ | ---------------------------------------- |
| F-SCR-01 | CAPTURE_FULL    | M      | S      | indicator visible                        |
| F-SCR-02 | CAPTURE_REGION  | M      | S      | interactive overlay                      |
| F-SCR-03 | CAPTURE_WINDOW  | M      | S      | per-app deny-list                        |
| F-SCR-04 | OCR             | M      | M      | local Ollama vision + Tesseract fallback |
| F-SCR-05 | COLOR_PICK      | C      | XS     |                                          |
| F-SCR-06 | FIND_IMAGE      | C      | M      | template match                           |
| F-SCR-07 | RECORD_VIDEO    | S      | L      | length-capped                            |
| F-SCR-08 | COMPARE_REGIONS | C      | M      |                                          |

### Clipboard (stream 22) — 5 ops

| ID      | Op         | MoSCoW | Effort |
| ------- | ---------- | ------ | ------ |
| F-CB-01 | READ       | M      | S      |
| F-CB-02 | WRITE      | M      | XS     |
| F-CB-03 | READ_HTML  | S      | S      |
| F-CB-04 | READ_IMAGE | C      | M      |
| F-CB-05 | HISTORY    | S      | M      |

### Notifications (stream 22) — 3 ops

| ID         | Op         | MoSCoW | Effort |
| ---------- | ---------- | ------ | ------ |
| F-NOTIF-01 | SHOW_TOAST | M      | XS     |
| F-NOTIF-02 | SHOW_MODAL | S      | S      |
| F-NOTIF-03 | SHOW_TRAY  | S      | XS     |

### Application (stream 23) — 9 ops

| ID       | Op                   | MoSCoW | Effort | OS-specific           |
| -------- | -------------------- | ------ | ------ | --------------------- |
| F-APP-01 | LAUNCH               | M      | S      | M                     |
| F-APP-02 | ACTIVATE             | M      | S      | M                     |
| F-APP-03 | QUIT                 | S      | S      | M                     |
| F-APP-04 | LIST_RUNNING         | M      | S      | M                     |
| F-APP-05 | LIST_INSTALLED       | S      | M      | M                     |
| F-APP-06 | SEND_KEYSTROKE       | M      | L      | M, **always pending** |
| F-APP-07 | CLICK_ELEMENT        | S      | L      | M                     |
| F-APP-08 | READ_ELEMENT         | S      | L      | M                     |
| F-APP-09 | FIND_WINDOW_BY_TITLE | M      | S      | M                     |

### Audio (stream 24) — 5 ops

| ID       | Op              | MoSCoW | Effort | Notes                      |
| -------- | --------------- | ------ | ------ | -------------------------- |
| F-AUD-01 | TRANSCRIBE_FILE | M      | M      | local whisper              |
| F-AUD-02 | TRANSCRIBE_MIC  | M      | L      | always pending + indicator |
| F-AUD-03 | SYNTHESISE      | S      | M      | Piper                      |
| F-AUD-04 | PLAY            | S      | XS     |                            |
| F-AUD-05 | RECORD          | S      | M      | length-capped              |

### System (stream 13 misc) — 7 ops

| ID       | Op           | MoSCoW | Effort |
| -------- | ------------ | ------ | ------ |
| F-SYS-01 | BATTERY      | C      | XS     |
| F-SYS-02 | NETWORK_INFO | S      | XS     |
| F-SYS-03 | DISK_USAGE   | S      | S      |
| F-SYS-04 | TIMEZONE     | C      | XS     |
| F-SYS-05 | LOCALE       | C      | XS     |
| F-SYS-06 | LOCK         | C      | XS     |
| F-SYS-07 | SUSPEND      | W      | XS     |

---

## Recipe features (stream 13)

| ID       | Name                                           | MoSCoW | Effort |
| -------- | ---------------------------------------------- | ------ | ------ |
| F-REC-01 | Recipe DSL (YAML/JSON, Zod-validated)          | M      | M      |
| F-REC-02 | Recipe save/load/version                       | M      | S      |
| F-REC-03 | Parametrised recipes with prompt-on-run        | M      | S      |
| F-REC-04 | Scheduled recipe runs (cron + on-event)        | M      | M      |
| F-REC-05 | Recipe library UI                              | M      | M      |
| F-REC-06 | Recipe import from marketplace                 | M      | S      |
| F-REC-07 | Recipe export / share                          | S      | XS     |
| F-REC-08 | Recipe debugger (step-through)                 | S      | M      |
| F-REC-09 | Per-step error handling (retry/fallback/abort) | M      | S      |
| F-REC-10 | Rollback chain (best-effort undo)              | M      | M      |
| F-REC-11 | Parallel groups                                | S      | S      |
| F-REC-12 | Recipe dry-run (preview policy match)          | M      | M      |

---

## UX features (streams 30, 31, 32)

| ID         | Name                                              | Stream | MoSCoW | Effort |
| ---------- | ------------------------------------------------- | ------ | ------ | ------ |
| F-TRAY-01  | System tray icon                                  | 30     | M      | M      |
| F-TRAY-02  | Tray menu (open palette / pause / restart / quit) | 30     | M      | S      |
| F-PAL-01   | Global hotkey                                     | 30     | M      | S      |
| F-PAL-02   | Command palette (fuzzy)                           | 30     | M      | M      |
| F-PAL-03   | Palette suggestions section                       | 30     | S      | S      |
| F-ACT-01   | Activity timeline                                 | 31     | M      | M      |
| F-ACT-02   | Activity filter bar                               | 31     | M      | S      |
| F-ACT-03   | Capability lineage view                           | 31     | M      | M      |
| F-AUDIT-01 | JSONL/CSV export                                  | 31     | M      | S      |
| F-PREV-01  | fs.diff preview                                   | 32     | M      | S      |
| F-PREV-02  | browser action preview                            | 32     | M      | M      |
| F-PREV-03  | screen capture preview                            | 32     | M      | S      |
| F-PREV-04  | clipboard preview (redacted)                      | 32     | M      | S      |
| F-PREV-05  | application target preview                        | 32     | M      | M      |
| F-PREV-06  | audio waveform preview                            | 32     | S      | M      |
| F-PREV-07  | recipe whole-flow preview                         | 32     | M      | M      |

---

## Enterprise features (stream 40)

| ID         | Name                         | MoSCoW | Effort |
| ---------- | ---------------------------- | ------ | ------ |
| F-FLEET-01 | Org device fleet view        | M      | M      |
| F-FLEET-02 | Fleet policy push (canary)   | M      | M      |
| F-FLEET-03 | Forced minimum agent version | M      | S      |
| F-FLEET-04 | Per-device kill switch       | M      | XS     |
| F-FLEET-05 | M-of-N approval chains       | M      | L      |
| F-FLEET-06 | Bulk pairing via CSV         | S      | M      |
| F-FLEET-07 | Org audit log export         | M      | S      |
| F-FLEET-08 | SAML SSO                     | M      | L      |
| F-FLEET-09 | OIDC SSO                     | M      | M      |
| F-FLEET-10 | DLP integration (deny-glob)  | C      | M      |

---

## Intelligence features (streams 41, 42)

| ID          | Name                                               | Stream | MoSCoW | Effort |
| ----------- | -------------------------------------------------- | ------ | ------ | ------ |
| F-MEM-01    | Local activity recording                           | 41     | M      | M      |
| F-MEM-02    | Activity retention sweeper                         | 41     | M      | XS     |
| F-SUGG-01   | Pattern detector                                   | 41     | M      | M      |
| F-SUGG-02   | Suggestion engine (30min cron)                     | 41     | M      | M      |
| F-SUGG-03   | Cloud sync per-record opt-in                       | 41     | S      | S      |
| F-LEARN-01  | Personalised system prompt from PREFERENCEs        | 41     | S      | S      |
| F-MARKET-01 | Browse marketplace                                 | 42     | M      | M      |
| F-MARKET-02 | Install (signature + sandbox + first-run approval) | 42     | M      | L      |
| F-MARKET-03 | Publish (signed)                                   | 42     | M      | M      |
| F-MARKET-04 | Fork recipe                                        | 42     | S      | S      |
| F-MARKET-05 | Rate + review                                      | 42     | S      | S      |
| F-MARKET-06 | Flag + auto-ban                                    | 42     | M      | M      |
| F-MARKET-07 | Publisher trust score                              | 42     | M      | M      |
| F-MARKET-08 | Monthly rescan                                     | 42     | M      | S      |

---

## Compliance / safety features (cross-cutting)

| ID        | Name                                  | MoSCoW | Effort |
| --------- | ------------------------------------- | ------ | ------ |
| F-SAFE-01 | PII detection on inputs/outputs       | M      | M      |
| F-SAFE-02 | Secret pattern detection              | M      | S      |
| F-SAFE-03 | Per-app deny-list (screen capture)    | M      | S      |
| F-SAFE-04 | Recording indicator (red badge)       | M      | S      |
| F-SAFE-05 | Per-jurisdiction audio consent prompt | S      | S      |
| F-SAFE-06 | DLP-style outbound content filter     | C      | L      |
| F-SAFE-07 | Right-to-be-forgotten endpoint        | M      | M      |

---

## Cross-cutting features

| ID     | Name                                                     | MoSCoW | Effort         |
| ------ | -------------------------------------------------------- | ------ | -------------- |
| F-X-01 | 9 i18n locales for every string                          | M      | S (per stream) |
| F-X-02 | Dark mode + RTL parity (frontend + tray)                 | M      | S              |
| F-X-03 | Mobile-responsive web frontend (375×812)                 | S      | S              |
| F-X-04 | Accessibility: keyboard nav + screen-reader labels       | M      | M              |
| F-X-05 | Capability cost dashboard (Ollama tokens + cloud tokens) | C      | M              |

---

## Feature count summary

- Capability primitives: 12 + 6 + 14 + 8 + 5 + 3 + 9 + 5 + 7 = **69**
- Recipes: **12**
- UX: **17**
- Enterprise: **10**
- Intelligence + marketplace: **14**
- Compliance / safety: **7**
- Cross-cutting: **5**

**Total: 134 features** (over the 100-140 target).

---

## Dependency graph (high-level)

```
Wave 0 (01, 02) ──┐
                  ▼
Wave 1 (10) ──┬──► Wave 1 (11, 12, 13)
              │
              ▼
Wave 2 (20-24) ──► Wave 3 (30, 31, 32) ──► Wave 4 (40, 41, 42)
              ▲
              └── 32 needs 11-23 for previews

50 (QA) and 60 (docs) — continuous.
```
