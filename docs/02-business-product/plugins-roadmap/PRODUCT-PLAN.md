# PRODUCT-PLAN: ClawAI Plugins, MCP and Skills

Baseline = PLUGIN-MAP.md. Gaps = GAPS.md. "Exists" claims there are verified in code.

## 1. Business / analyst view

- Why: "Every AI, one workspace" positioning (memory 2026-09-26). Tools and integrations are the retention layer; today web chat has 3 built-in tools and no way to use a registered MCP server.
- Money levers (all [A], need owner decision): plan columns already exist (`allowPlugins`, `maxInstalledPlugins` default 5, `maxUserMcpServers` default 0; auth-service schema.prisma:247-249) -> Free: curated catalog only (5), Pro: + custom remote MCP (3-10), Business: team-shared connectors + audit export. `PLUGIN_CALLS` quota exists (ADR-179 item 8). Tool calls cost no model tokens by themselves but add loop rounds (more weighted tokens, rule 46). Do not add a third quota number (memory: weighted tokens are dollars).
- Metrics: install rate, D30 retention of installers, tool calls per active user, consent-decline rate, tool error rate per server, % chats with a tool, support tickets per connector, cost per call.
- Risks: supply chain (hostile servers), prompt injection (exfiltration), OAuth token custody, abuse as an open proxy (ADR-171 risk 10), vendor MCP URL churn.

## 2. Personas and jobs-to-be-done

| Persona                                     | JTBD                                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Maya, non-technical PM (Free/Pro)           | "When I chat, let the AI read my Jira/Drive/Slack and draft with it, without me touching JSON" |
| Omar, developer (Pro)                       | "Connect my own MCP server (URL + key), see its tools, trust-but-verify, use it with @"        |
| Lina, team lead (Business)                  | "Give my team approved connectors only; see who used what"                                     |
| Admin (ClawAI staff, owner)                 | "Curate the catalog, kill a bad plugin in one click, see health, cost and abuse"               |
| Plugin author (owner's Claude Code plugins) | "Publish/import my plugin bundle (skills, commands, MCP) and have it work in ClawAI"           |
| Arabic/Persian RTL user                     | all of the above in RTL with correct text                                                      |

## 3. User stories and acceptance criteria (Given/When/Then, short)

### Phase MVP (make what exists useful)

S1 Use my own MCP server in chat (P0-1). AC: a registered APPROVED server appears in `@` picker with a "mine" badge; resolve returns its tools as `plugin_<slug>_<tool>` (<=64 chars, folded names); a READ tool runs; a WRITE tool without grant yields the consent flow (S2); another user's server id never resolves (404 same as missing); a NEEDS_REVIEW/disabled server is not offered; works on CHAT/COMPARE/CONSENSUS/ESCALATION (rule 59 parity map).
S2 Per-tool permission prompt in chat (P0-4). AC: SSE event `PLUGIN_CONSENT_REQUIRED` with redacted preview + args hash; card with Allow once / Always for this tool / Deny; DESTRUCTIVE never offers Always; a decision resumes the same `callId` (idempotent); timeout 120 s = deny, model told not to retry; on mobile bottom sheet; screen-reader announces; works in Compare per lane; tainted turn shows "ask every time" copy.
S3 Admin curates catalog without a deploy (P0-2). AC: `POST /plugins/admin/catalog` creates a CURATED_MCP entry from a manifest form (url, auth kind, header, tools via live discovery, 13-locale text with English fallback + machine-translate draft flag), validated by `parsePluginManifest`; draft -> preview as admin -> publish; edit creates a new version and shows the diff; kill switch exists already. Hostile manifest (bidi, remote $ref, private URL) rejected with field errors.
S4 Admin approval queue (P0-5). AC: pending servers list (owner, URL host, tools with risk, discovery hash); approve / reject with reason / disable; user sees status and reason; email/in-app notice; audit row; `requireApproval` default stays off until this ships.
S5 Marketplace browse/search/install. AC: Discover shows categories, search (name, tool, publisher), featured row, "works in chat" badges, auth type icon (none/key/OAuth), risk summary; install dialog lists tools+risk+hosts+scopes (exists); empty state for no results with "request an integration" link; plan-cap message with upgrade CTA; keyboard accessible; RTL.

### Phase Next (OAuth + import)

S6 OAuth connect (P0-3). AC: "Connect" opens provider consent in a popup/redirect with `state` bound to session+user (single use, 10 min), PKCE S256, exact redirect URI allow-list, dynamic client registration when the server supports it; tokens sealed AES-GCM AAD user:install; refresh before expiry with lock; revoke on uninstall/disconnect; reconnect banner on 401; scopes shown before redirect; error states: denied, expired state, scope mismatch, provider down.
S7 Import from GitHub URL. AC: paste `https://github.com/owner/repo[/tree/ref/path]`; server (plugin-service, SafeEgress only, github.com/codeload hosts allow-listed) fetches pinned commit sha; detects `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `clawai-plugin.json`, `.mcp.json`, `skills/*/SKILL.md`, `commands/`, `agents/`; shows a review screen: what it contributes (skills, commands, agents, hooks, MCP servers) with "will run" vs "will not run on web"; installs only supported parts; unsupported parts listed, never silently dropped; records commit sha and content hash; update available banner.
S8 Upload zip. AC: <=10 MB, <=500 files, depth<=8 (matches coding agent limits, plugin-manifest.constants.ts:21-35); server-side extraction in a throwaway worker; reject absolute paths, `..`, symlinks, device names, duplicate case-insensitive names, non-UTF8 text files, decompression ratio >100; same review screen as S7.
S9 Custom MCP wizard (upgrade existing dialog). AC: 4 steps: URL -> auth (none / header key / bearer / OAuth auto-detect) -> live discovery with tool list and per-tool risk selector (default WRITE) -> name/icon/enable. Inline test call button. Clear errors (`MCP_URL_BLOCKED` explained without leaking why). Presets for popular servers.

### Phase Later

S10 Skills library (web). AC: create/import/edit SKILL.md (frontmatter `name`, `description`, body); toggle per chat (`/skill-name` or chip); stored per user (new table `skills`), size cap 32 KB, text scanned for hostile chars; injected as a bounded system block labelled user-authored (NOT trusted over system rules); share by link (private/team); skills from imported plugins appear read-only. Acceptance includes injection test: skill text cannot disable the untrusted-result fence.
S11 Team/Workspace scope. Install once for workspace; member opt-in; admin allow/deny per workspace.
S12 Admin console v2: allow/deny lists (by host, publisher, slug), per-plan overrides, audit viewer (filters user/tool/status/time, CSV export), health checks (scheduled tool-list ping, status, latency, breaker state), usage/cost per plugin, review queue for community submissions, signature/verification badge (Ed25519 + sha256 as in coding-agent plugin-signature.constants.ts).
S13 stdio server hosting (sandbox) or "run locally via ClawAI desktop/VS Code" bridge.
S14 Community publish flow with review + signing.

## 4. UX specs (all phases)

- Chat: `@` picker groups "Connected", "Mine", "Suggested"; selected chips show state dot (ok / needs reconnect / needs review); `/` picker for skills; per-chat tool toggle popover; live timeline per call (exists: plugin-call-timeline) with expandable redacted args; "Why was this blocked?" link.
- Empty states: no installs ("Connect your first app"), no results, server has zero valid tools (explain skipped tools and why), offline server.
- Error states (copy mapped from codes): `PLUGIN_INSTALL_LIMIT`, `PLUGIN_PLAN_DISABLED`, `MCP_URL_BLOCKED`, `MCP_SERVER_UNREACHABLE`, `MCP_SERVER_REJECTED`, `NEEDS_REVIEW`, `CONSENT_REQUIRED`, breaker open, quota exhausted.
- Onboarding: after first successful install, suggest an example prompt using the tool; settings link in first chat; 3-step tour for Business admin.
- i18n/RTL: every string in 13 locales (`plugin*` translation files exist, e.g. lib/i18n/locales/plugins-install-translations.ts); manifest text localized with per-field English fallback (exists); Arabic/Persian names with U+200C allowed (CLAUDE.md constraint); tool names stay LTR code spans; logical CSS properties only.
- Telemetry (no content): `plugin_install_started/completed/failed(code)`, `oauth_connect_*`, `consent_shown/decided`, `tool_call(status, ms, risk)`, `import_*`, `skill_used`. Never args or results (matches audit design).

## 5. Roadmap with exact deliverables

### MVP (about 3-4 weeks, after owner approves)

1. resolve + mentions for own servers: edit `modules/runtime/services/plugin-resolve.service.ts`, `installs` mentions endpoint (add `kind: SERVER`), frontend `use-plugin-mention-options.ts`. No new table.
2. Consent channel: new SSE events in chat-service, new `POST /plugins/consent/decide` or reuse `userApproved` with Redis wait (design: Redis, currently absent), card component.
3. Admin create/edit catalog: `POST/PUT /plugins/admin/catalog`, admin form screen `/admin/plugins/new`, discovery reuse from `mcp-tool-snapshot.manager`.
4. Admin approval: `GET /plugins/admin/servers`, `POST .../:id/approve|reject|disable`; tab "Servers" in admin page; new `PluginSetting` rows only (rule: config in DB).
5. Seed W1 curated entries (10-15) via admin UI; docs update (service guide, plugins-installs.md, skills/add-a-catalog-plugin.md) per rule 63.

### Next (4-6 weeks)

6. OAuth: tables `plugin_oauth_clients` (per provider), `plugin_oauth_states`, tokens in credential tables with `OAUTH2_PKCE` kind; endpoints `GET /plugins/oauth/start`, `GET /plugins/oauth/callback`, `POST /plugins/installs/:id/reconnect`; nginx callback route; MCP auth spec (resource metadata, DCR).
7. Import pipeline: `POST /plugins/import/preview {url}` and `/plugins/import/upload` (multipart), `POST /plugins/import/commit`; tables `plugin_imports` (source, sha, contentHash, parts JSON, status), `plugin_packages` (blob in file-service); parser module for Claude and Codex formats (see QA spec); extraction worker isolated.
8. Bridge workspace-service connectors as tools (P1-7).
9. Events + retention job + audit viewer endpoint.

### Later

10. Skills library tables `skills`, `skill_shares`; chat injection manager under rule 59; 11. Team scope; 12. Admin v2; 13. stdio sandbox; 14. Community publish + signing; 15. Agent-service and Threads wiring.

Dependencies: auth-service (plan columns, permissions, quota hold), chat-service (`callProvider` chokepoint, SSE), file-service (package blobs), workspace-service (OAuth bridge), audit-service (events), nginx + all compose files for any new route/service (rule 05). No new service needed for MVP/Next; stay in plugin-service (ADR-171).
