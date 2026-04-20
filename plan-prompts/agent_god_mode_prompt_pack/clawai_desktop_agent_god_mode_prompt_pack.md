# ClawAI Desktop Agent — GOD Mode Prompt Pack
This pack is based on the uploaded ClawAI Desktop Agent audit and is intended to help Claude implement a much stronger agent-cli and agent-service stack.
## Included prompts
- 00_master_mission.md
- 01_audit_restate_and_gap_map.md
- 02_auth_replatform_strategy.md
- 03_device_pairing_magic_link.md
- 04_device_code_fallback_and_headless.md
- 05_token_refresh_rotation_revocation.md
- 06_cli_rearchitecture_and_keychain.md
- 07_agent_service_schema_and_guards.md
- 08_webapp_connect_device_ux.md
- 09_streaming_terminal_and_command_runtime.md
- 10_safety_policy_scopes_and_audit.md
- 11_power_features_os_files_git_browser.md
- 12_chat_integration_and_agentic_workflows.md
- 13_team_devices_admin_and_enterprise.md
- 14_testing_tdd_security_and_quality.md
- 15_release_plan_metrics_and_rollout.md

---

# 00 — Master Mission Prompt

You are acting as a principal systems architect, senior product engineer, staff security engineer, DevEx lead, QA director, and business/product strategist.

Your mission is to transform ClawAI's current desktop agent stack — `agent-cli`, `claw-agent-service`, related frontend pages, infra, auth, and command runtime — into a production-grade **GOD mode local agent platform**.

You must treat the uploaded audit as the source-of-truth baseline.

## Critical constraints
1. Do not hand-wave. Use the audit findings as fixed facts unless code inspection proves a newer state.
2. Prefer additive migration plans over breaking rewrites unless a component is actively harmful.
3. Optimize for:
   - lower auth friction
   - durable device trust
   - stronger safety and auditability
   - stronger local power
   - better user activation
   - better enterprise trust
   - self-hosted friendliness
4. Every recommendation must be business-beneficial, user-beneficial, and technically defensible.
5. Every major feature must include backend, CLI, frontend, security, testing, observability, and rollout implications.

## Non-negotiable target outcomes
- zero copy-paste JWT auth for normal users
- browser-based pairing from CLI or webapp
- durable access + refresh auth model
- token rotation, reuse detection, per-device revocation
- keychain-backed credential storage
- live command streaming, timeout, cancel
- safe policy/scopes/approval model
- visible device management in webapp
- OS-level capabilities beyond raw `exec`
- strong chat-to-device workflows
- production-grade testing and release quality

## Deliverables
Produce:
1. final target architecture
2. gap map from current state
3. prioritized roadmap
4. exact implementation plan
5. APIs and schema changes
6. CLI command redesign
7. frontend UX redesign
8. safety and audit model
9. TDD + testing strategy
10. rollout and migration plan
11. KPIs and business value narrative

Be extremely specific and strict.

---

# 01 — Audit Restatement and Gap Map Prompt

Use the uploaded ClawAI Desktop Agent audit as your factual baseline.

First, restate the current system in a structured way:
- CLI current commands
- auth flow today
- token storage today
- agent-service models/endpoints today
- frontend surfaces today
- infra/nginx limitations today
- dead code / duplication today
- product dead ends today

Then build a **gap map** with these columns:
- capability area
- current state
- why it hurts users
- why it hurts the business
- security/ops risk
- target state
- urgency (P0 / P1 / P2)
- dependency blockers

Make sure you explicitly include:
- copy-paste JWT auth pain
- plain-text local token storage
- 120-second stale-session expiry behavior
- no refresh endpoint
- lack of webapp connect UX
- no device model
- no revocation safety
- no streaming, timeout, cancel
- no daemon/service mode
- no command templates / scheduling
- no file transfer / git-native / browser-native powers
- no strong team/admin/device management
- no real testing depth

The output must be a **decision-grade diagnostic**, not recommendations only.

---

# 02 — Auth Replatform Strategy Prompt

Design the full future authentication architecture for ClawAI desktop agent.

You must solve:
- no copy-paste auth
- durable authorization after initial approval
- silent refresh without user friction
- secure revocation
- secure storage on client
- headless and GUI use cases
- self-hosted compatibility
- migration from legacy sessionKey model

Use this decision framework:
1. compare magic-link pairing, loopback PKCE, device-code grant (RFC 8628), custom URL schemes, QR pairing
2. explicitly justify the chosen primary flow and fallback flow
3. define token model:
   - access token
   - refresh token
   - token rotation
   - reuse detection
   - scopes
   - device binding
   - expiry strategy
4. define DB changes:
   - Device
   - RefreshToken
   - PairingRequest
   - migration path from AgentSession
5. define backend endpoints:
   - pair/init
   - pair/approve
   - device-code/create
   - device-code/token
   - auth/refresh
   - auth/revoke
   - device list
   - device revoke
6. define CLI behavior:
   - login
   - auto-refresh on 401
   - logout
   - whoami
   - doctor
7. define frontend behavior:
   - connect device page
   - approve/cancel device screen
   - settings/devices management
8. define security controls:
   - hashed refresh tokens
   - revoked-device blocking
   - suspicious refresh-token reuse handling
   - audit trail
9. define migration from sessionKey and how to sunset it safely

Be concrete: endpoints, DTOs, claims, TTLs, state diagrams, failure paths, and rollout sequence.

---

# 03 — Magic-Link Device Pairing Prompt

Implement the primary browser-based device-pairing experience for ClawAI desktop agent.

The target experience:
- user runs `claw-agent login`
- CLI opens browser or prints a URL
- webapp shows a polished "Connect this device" approval screen
- user approves once
- CLI receives durable credentials and stores them securely
- user never has to copy tokens or log in again unless revoked or very long-lived refresh expires

Your output must include:
1. full UX flow from CLI to browser to callback back to CLI
2. loopback listener design and fallback behavior if port binding fails
3. exact pairing request model
4. exact backend endpoints and payloads
5. frontend page design and messaging
6. OS/device metadata collected and why
7. anti-CSRF / anti-replay / code expiry rules
8. abuse and failure cases:
   - code reused
   - callback never reached
   - browser opened under wrong account
   - code expired
   - user cancels
   - multiple CLIs racing same code
9. CLI ergonomics:
   - `login`
   - `login --no-open`
   - `login --json`
   - `login --device-name`
10. acceptance criteria and test matrix

Do not keep this generic. Write it as if you will hand it to engineers tomorrow.

---

# 04 — Device-Code Fallback and Headless Prompt

Design the headless fallback for environments where the CLI cannot open a browser or receive a loopback callback.

Examples:
- SSH session
- container
- CI job
- WSL shell without browser access
- locked-down enterprise environment

You must implement a device-code style flow similar in spirit to RFC 8628:
- create device code
- print verification URL and user code
- poll for completion
- retrieve token pair after approval

Deliver:
1. the exact backend endpoints
2. payloads and polling contract
3. DB state model for pending device-code authorizations
4. expiry, retry interval, max polling behavior
5. frontend verify-code page
6. CLI UX and terminal output
7. security controls
8. differences between GUI pairing and headless pairing
9. when the CLI should choose fallback automatically
10. tests and abuse cases

Also define how this works in self-hosted deployments where the webapp domain may vary.

---

# 05 — Token Refresh, Rotation, and Revocation Prompt

Design and implement a production-grade refresh and revocation model for ClawAI desktop agent.

Today there is no refresh endpoint and sessions expire due to stale heartbeat behavior. Fix that completely.

You must define:
1. access token lifetime
2. refresh token lifetime
3. sliding expiration policy
4. rotation on every refresh
5. reuse detection strategy
6. what happens when an old refresh token is reused
7. device revocation semantics
8. instant invalidation strategy
9. server-side hashing/storage model
10. client-side reaction to:
   - access expired
   - refresh expired
   - device revoked
   - suspicious reuse
   - server clock skew
11. migration from plain sessionKey
12. observability signals and audit events

Add:
- exact Prisma models
- endpoint contracts
- guard changes
- middleware/interceptor changes
- CLI retry logic and backoff
- device lifecycle state machine
- deprecation timeline for old auth

Testing must cover normal, race, stolen-token, and reconnect scenarios.

---

# 06 — CLI Rearchitecture and Keychain Prompt

Redesign `agent-cli` from a minimal script into a serious product-grade CLI.

Current issues from the audit include:
- no real CLI framework
- manual arg dispatch
- no tests
- no login/logout/whoami/doctor
- plain-text config
- duplicated request helpers
- no daemon mode
- no auto-refresh
- no cancellation/streaming/timeouts

Design the new CLI with:
1. command architecture and directory structure
2. a real CLI framework choice
3. config and secret storage model
4. OS keychain integration
5. Linux headless fallback storage
6. retry and reconnect behavior
7. service/daemon mode options
8. upgrade/version checks
9. command list, at minimum:
   - login
   - logout
   - whoami
   - doctor
   - status
   - start
   - stop
   - tail
   - run
   - watch
   - devices
   - config get/set
10. telemetry and logging model
11. packaging strategy:
   - npm global
   - single binary
   - signed installer (future)
12. code-quality plan:
   - lint
   - unit tests
   - integration tests
   - CLI snapshot tests

Be explicit about modules, responsibilities, and migration from current `index.js`.

---

# 07 — Agent Service Schema, Guards, and Runtime Prompt

Redesign `claw-agent-service` so it supports durable devices, secure auth, stronger runtime state, and future power features.

The output must cover:
1. Prisma schema evolution
2. repository/service refactors
3. shared ownership-check helpers
4. pagination helper extraction
5. removal or real use of dead modules (`RedisService`, `ENCRYPTION_KEY`)
6. guard model:
   - user auth guard
   - device access-token guard
   - device refresh token handling
   - scope guard
   - admin/team device guard
7. event model:
   - session/device connected
   - device revoked
   - command requested/approved/started/streamed/completed/cancelled
   - file event observed
   - script scheduled/fired
8. runtime state model:
   - device
   - connection/session
   - command run
   - scheduled job
   - live stream
9. heartbeat redesign:
   - what remains heartbeat-based
   - what is no longer coupled to auth expiry
10. Redis role if retained:
   - presence
   - revocation cache
   - command stream fanout
   - rate limits
11. health endpoint upgrades:
   - dependency-aware health
   - queue/db/redis status
12. performance and resilience considerations

Do not only suggest models. Provide exact implementation boundaries and module map.

---

# 08 — Webapp Connect-Device UX Prompt

Design the full frontend experience for connecting and managing desktop agents in ClawAI.

Current audit problems:
- no Connect CLI page
- no device list
- no revoke button
- no token display page
- terminal page only polls pending approvals
- agent pages are operational, not activation-focused

Create the future UX with these surfaces:
1. `/agent/connect`
2. `/settings/devices`
3. `/agent` overview
4. `/agent/terminal`
5. `/agent/repos`
6. device detail page
7. onboarding banner / empty states
8. connect-from-webapp and connect-from-CLI coexistence

Include:
- IA / navigation
- page purposes
- component breakdown
- loading/error/empty/success states
- approval dialogs
- revoke flows
- "last seen" / health / version badges
- streaming output UI
- device scopes display
- team/admin views
- i18n requirements
- accessibility requirements
- telemetry/analytics events

Also define how these pages guide users to immediate value, not just management.

---

# 09 — Streaming Terminal and Command Runtime Prompt

Transform the current buffered `exec` model into a powerful, safe, live runtime.

You must design:
1. switch from `exec` to `spawn`
2. stdout/stderr streaming
3. SSE vs WebSocket decision and justification
4. nginx changes for streaming
5. command timeout model
6. cancel/kill model
7. command status transitions
8. output persistence strategy
9. truncation rules and artifact storage
10. live terminal UI using structured stream events
11. security boundaries for long-running commands
12. how this interacts with chat

Also add:
- one-shot commands
- multi-step scripts
- scheduled commands
- working-directory controls
- environment variable injection rules
- shell selection per OS
- output metadata (start/end, duration, signal, exit code)

Testing must include:
- fast command
- long-running command
- huge output
- partial failure
- cancel midway
- timeout
- stream disconnect and reconnect

---

# 10 — Safety, Policy, Scopes, and Audit Prompt

Design the safety system that makes desktop-agent power acceptable for real customers and enterprises.

You must define:
1. scope system:
   - sessions:read
   - commands:execute
   - shell:exec
   - shell:exec-in-repo
   - fs:read
   - fs:write
   - scripts:execute
   - schedule:write
   - repos:write
   - browser:control
   - clipboard:read/write
2. per-device and per-user policy assignment
3. approval policies:
   - always approve
   - always require approval
   - always deny
   - risk-tiered approval
4. dangerous command detection
5. command allow/deny regex catalogs
6. risk scoring and labeling in UI
7. audit log model
8. tamper-evident log chaining
9. anomaly detection heuristics
10. rate limits and cool-downs
11. revocation and lockout paths
12. enterprise controls and admin overrides

Also include:
- privacy considerations
- how to make this self-hosted friendly
- how to explain trust to customers
- how to test that dangerous cases are actually blocked

---

# 11 — Power Features: OS, Files, Git, Browser Prompt

Brainstorm and specify the full power-feature roadmap for ClawAI desktop agent.

I do not want only obvious ideas. I want a broad and deep capability map.

At minimum cover:
1. filesystem reads/writes with approvals
2. diff/patch application
3. file upload/download integration with file-service
4. repo indexing
5. git-native operations (status, diff, log, branch, checkout, commit, stash, fetch, pull, push with safeguards)
6. VS Code / editor opening
7. local dataset analysis hooks
8. browser automation
9. screenshoting
10. clipboard bridge
11. local notifications
12. OS telemetry
13. process inspection
14. service control
15. local dev-server tunneling / preview
16. script library and reusable workflows
17. cron-like scheduling
18. local-first research and grep
19. multi-repo workspace awareness
20. project-scoped memories / preferences

For every feature, define:
- user value
- business value
- security bar
- technical complexity
- dependencies
- MVP vs later phase
- ideal UI entry points
- test strategy

Be expansive. Brainstorm more than the audit alone already listed, while staying grounded.

---

# 12 — Chat Integration and Agentic Workflows Prompt

Make the desktop agent deeply useful inside ClawAI chat and agent experiences.

Design workflows such as:
- "Run this" button in chat
- approve-and-execute from assistant suggestions
- stream terminal output back into the conversation
- use local repo/files as context in research or coding chats
- ask the agent to inspect a local project before answering
- upload artifacts back into the thread
- propose patches and apply after approval
- open files/projects locally
- run repeatable local workflows from chat
- target a specific device or device group

You must define:
1. UX and message components
2. backend orchestration between chat-service and agent-service
3. how router/final-model selection should work when local agent is involved
4. how actions are approved, streamed, summarized, and archived
5. how local agent results become citations/context safely
6. how to prevent overreach by the model
7. high-value prebuilt workflows
8. failure handling and human handoff
9. telemetry and success metrics

Think like a product strategist, not only an engineer. This should create demo-worthy moments and sticky usage.

---

# 13 — Team Devices, Admin, and Enterprise Prompt

Design the enterprise and multi-device layer for ClawAI desktop agent.

Cover:
1. personal devices
2. shared devices
3. team devices
4. device groups
5. admin visibility
6. org-wide policies
7. role-based permissions
8. delegated approval
9. audit export
10. compliance and legal guardrails
11. alerting on suspicious behavior
12. agent version fleet management
13. forced upgrades / minimum version enforcement
14. incident response playbooks
15. support tooling and debug bundle collection

Include:
- target personas
- core admin views
- org/device/group data model
- policy inheritance
- tenancy concerns
- self-hosted enterprise expectations
- phased rollout path
- revenue/packaging opportunities if relevant

The goal is to make the agent not just cool for one engineer, but viable for teams and enterprises.

---

# 14 — Testing, TDD, Security, and Quality Prompt

Produce the full quality plan for the desktop agent initiative.

I want extremely high standards.

Cover:
1. TDD strategy for CLI, backend, frontend, and streaming flows
2. unit tests
3. integration tests
4. API tests
5. CLI command tests
6. browser-based UI tests
7. E2E tests across CLI + webapp + backend
8. security tests
9. auth abuse tests
10. refresh/reuse-detection tests
11. revoke tests
12. streaming reliability tests
13. performance/load tests
14. offline/reconnect/sleep-resume tests
15. cross-platform tests (macOS/Windows/Linux)
16. manual QA matrix
17. observability and alerting validation
18. release gates and definition of done

Explicitly include test scenarios for:
- login via browser
- login via device-code fallback
- successful refresh
- stolen refresh token reuse
- revoked device
- laptop sleep > 2 minutes
- huge stdout streaming
- command cancel
- dangerous command approval blocks
- scheduled jobs
- chat-driven local execution
- file upload/download
- browser automation safety

I want exact test case groups, tooling suggestions, coverage expectations, and merge/release gates.

---

# 15 — Release Plan, Metrics, and Rollout Prompt

Turn the full desktop-agent redesign into a realistic phased rollout.

You must deliver:
1. epics
2. milestones
3. sequencing
4. dependency graph
5. staffing assumptions
6. risk register
7. rollout flags
8. migration plan from current sessionKey flow
9. beta plan
10. support readiness
11. documentation plan
12. KPI dashboard

Use this as the target journey:
- Phase A: auth replatform
- Phase B: trust/safety
- Phase C: streaming terminal
- Phase D: power features
- Phase E: enterprise polish
- Phase F: exploratory

For each phase include:
- business goal
- user impact
- engineering scope
- backend/frontend/CLI/infra work
- test exit criteria
- launch risks
- success metrics

The final output should be something leadership could use to prioritize investment.
