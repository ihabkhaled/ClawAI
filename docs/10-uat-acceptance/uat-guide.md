# User Acceptance Testing Guide

Structured UAT plan for validating ClawAI features from an end-user perspective. Each section covers a feature area with test scenarios, expected outcomes, and evidence requirements.

Last updated: 2026-04-09

---

## General Instructions

1. **Environment**: Run all tests against the full Docker Compose dev environment (`docker compose -f docker-compose.dev.yml up -d`).
2. **Accounts**: Use the seeded admin account (credentials in `.env`: ADMIN_EMAIL, ADMIN_PASSWORD). Create additional Operator and Viewer accounts for RBAC testing.
3. **Browser**: Test in Chrome (latest) as primary. Cross-check critical flows in Firefox and Safari.
4. **Evidence**: For each scenario, capture a screenshot or API response as proof of pass/fail.
5. **Defects**: Log defects with: scenario ID, steps to reproduce, expected vs actual, screenshot, browser/OS.

---

## 1. Authentication and Authorization

### 1.1 Login Flow

| ID      | Scenario            | Steps                                     | Expected Outcome                                                  |
| ------- | ------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| AUTH-01 | Valid login         | Enter valid email + password, click Login | Redirect to dashboard; JWT stored; user info displayed in sidebar |
| AUTH-02 | Invalid credentials | Enter wrong password                      | Error message displayed; no redirect; no token stored             |
| AUTH-03 | Empty fields        | Submit with empty email or password       | Validation errors shown inline                                    |
| AUTH-04 | Session persistence | Login, close tab, reopen app              | User remains logged in (refresh token active)                     |
| AUTH-05 | Logout              | Click logout button                       | Redirect to login page; tokens cleared; API calls return 401      |

### 1.2 RBAC Enforcement

| ID      | Scenario              | Steps                                       | Expected Outcome                                                         |
| ------- | --------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| AUTH-06 | Admin access          | Login as Admin, navigate to Admin page      | Full access to all features; user management visible                     |
| AUTH-07 | Operator restrictions | Login as Operator, navigate to Admin page   | Admin page not accessible or not visible in navigation                   |
| AUTH-08 | Viewer restrictions   | Login as Viewer, attempt to create a thread | Create actions disabled or hidden; read-only access                      |
| AUTH-09 | Token expiry          | Wait for access token to expire             | Refresh token automatically obtains new access token; no user disruption |

**Evidence required**: Screenshots of each role's navigation menu and an attempt to access a restricted feature.

---

## 2. Chat Functionality

### 2.1 Thread Management

| ID      | Scenario        | Steps                            | Expected Outcome                                                          |
| ------- | --------------- | -------------------------------- | ------------------------------------------------------------------------- |
| CHAT-01 | Create thread   | Click new thread button          | Thread created; appears in thread list; redirect to thread page           |
| CHAT-02 | Thread title    | Send first message in new thread | Thread title auto-generated or editable                                   |
| CHAT-03 | Thread list     | Create 3+ threads                | All threads visible in sidebar; sorted by most recent activity            |
| CHAT-04 | Delete thread   | Delete a thread                  | Thread removed from list; messages deleted; confirmation prompt shown     |
| CHAT-05 | Thread settings | Open thread settings panel       | System prompt, temperature, max tokens, model, context packs all editable |

### 2.2 Message Flow

| ID      | Scenario          | Steps                              | Expected Outcome                                                         |
| ------- | ----------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| CHAT-06 | Send message      | Type message, press Enter/Send     | User message appears; thinking indicator shown; AI response streams in   |
| CHAT-07 | Message display   | After AI responds                  | Both user and AI messages visible; AI message shows provider/model badge |
| CHAT-08 | Token counts      | View completed AI message          | Input tokens, output tokens, and latency displayed in message metadata   |
| CHAT-09 | Message feedback  | Click thumbs up/down on AI message | Feedback recorded; visual confirmation shown                             |
| CHAT-10 | Regenerate        | Click regenerate on AI message     | New AI response generated; may use different provider/model              |
| CHAT-11 | Long conversation | Send 20+ messages in a thread      | All messages load correctly; scroll works; no performance degradation    |
| CHAT-12 | Empty message     | Press Send with empty input        | Send button disabled; no empty message created                           |

### 2.3 Streaming and Responsiveness

| ID      | Scenario             | Steps                                       | Expected Outcome                                                                       |
| ------- | -------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| CHAT-13 | SSE streaming        | Send a message that triggers cloud provider | Response appears token-by-token (not all at once)                                      |
| CHAT-14 | Thinking indicator   | Send a message                              | Thinking indicator visible while waiting for response; disappears when response starts |
| CHAT-15 | Network interruption | Disconnect network mid-stream               | Graceful error message; partial response preserved if possible                         |

**Evidence required**: Screenshots of message with provider badge, token counts, and streaming in progress.

---

## 3. Routing

### 3.1 Routing Modes

| ID       | Scenario       | Steps                                        | Expected Outcome                                                                                 |
| -------- | -------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ROUTE-01 | AUTO mode      | Send coding question with AUTO mode          | Routed to appropriate provider (e.g., Anthropic for coding); routing transparency shows decision |
| ROUTE-02 | LOCAL_ONLY     | Set LOCAL_ONLY mode, send message            | Response from local Ollama model; no cloud provider used                                         |
| ROUTE-03 | MANUAL_MODEL   | Select specific provider+model, send message | Response from exactly the selected provider and model                                            |
| ROUTE-04 | PRIVACY_FIRST  | Set PRIVACY_FIRST, send message              | Routed to local Ollama if healthy; falls back to Anthropic if local unavailable                  |
| ROUTE-05 | LOW_LATENCY    | Set LOW_LATENCY, send message                | Routed to OpenAI/gpt-4o-mini                                                                     |
| ROUTE-06 | HIGH_REASONING | Set HIGH_REASONING, send message             | Routed to Anthropic/claude-opus-4                                                                |
| ROUTE-07 | COST_SAVER     | Set COST_SAVER, send message                 | Routed to local model if healthy; else cheapest cloud                                            |

### 3.2 Routing Transparency

| ID       | Scenario           | Steps                                          | Expected Outcome                                                                      |
| -------- | ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| ROUTE-08 | Decision display   | Send message in AUTO mode, expand routing info | Shows: selected provider, model, confidence score, reason tags, privacy/cost class    |
| ROUTE-09 | Fallback indicator | Send message when primary provider fails       | Routing transparency shows fallback was used; original and fallback providers visible |

### 3.3 Routing Policies

| ID       | Scenario        | Steps                                                 | Expected Outcome                                             |
| -------- | --------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| ROUTE-10 | View policies   | Navigate to Routing page                              | Active policies listed with name, mode, priority             |
| ROUTE-11 | Create policy   | Create new routing policy                             | Policy appears in list; affects subsequent routing decisions |
| ROUTE-12 | Policy priority | Create conflicting policies with different priorities | Higher priority policy takes precedence                      |

**Evidence required**: Screenshots of routing transparency panel, routing decisions page, and policy list.

---

## 4. Connectors (Cloud Providers)

| ID      | Scenario         | Steps                                           | Expected Outcome                                                  |
| ------- | ---------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| CONN-01 | List connectors  | Navigate to Connectors page                     | All configured connectors listed with status indicators           |
| CONN-02 | Add connector    | Add new OpenAI connector with API key           | Connector created; test connection succeeds; status shows healthy |
| CONN-03 | Invalid API key  | Add connector with invalid key, test connection | Test fails; error message shown; connector status unhealthy       |
| CONN-04 | Model sync       | Click sync on a connector                       | Models fetched from provider; model list updated                  |
| CONN-05 | Edit connector   | Modify connector base URL                       | Changes saved; re-test shows updated configuration                |
| CONN-06 | Delete connector | Delete a connector                              | Connector removed; routing no longer uses this provider           |
| CONN-07 | Health check     | View connector health status                    | Health events shown; last check timestamp; latency                |

**Evidence required**: Screenshots of connector list, add/edit forms, sync results, and health status.

---

## 5. Memory and Context

### 5.1 Memory Management

| ID     | Scenario        | Steps                              | Expected Outcome                                                        |
| ------ | --------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| MEM-01 | Auto-extraction | Complete a conversation with facts | Memory service extracts facts/preferences (check memory page)           |
| MEM-02 | View memories   | Navigate to Memory page            | User's memories listed by type (FACT, PREFERENCE, INSTRUCTION, SUMMARY) |
| MEM-03 | Edit memory     | Edit a memory record               | Changes saved; updated content used in future conversations             |
| MEM-04 | Delete memory   | Delete a memory record             | Memory removed; no longer included in context assembly                  |
| MEM-05 | Toggle memory   | Disable a memory without deleting  | Memory hidden from context assembly; re-enable restores it              |

### 5.2 Context Packs

| ID     | Scenario         | Steps                                  | Expected Outcome                                    |
| ------ | ---------------- | -------------------------------------- | --------------------------------------------------- |
| MEM-06 | Create pack      | Create context pack with items         | Pack appears in list; items ordered by sort order   |
| MEM-07 | Attach to thread | Attach context pack in thread settings | Pack items included in subsequent messages' context |
| MEM-08 | Multiple packs   | Attach 2+ packs to a thread            | All pack items included; no duplicates              |

**Evidence required**: Screenshots of memory list, context pack creation, and thread settings with packs attached.

---

## 6. File Management

| ID      | Scenario          | Steps                                         | Expected Outcome                                                           |
| ------- | ----------------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| FILE-01 | Upload file       | Upload a text/CSV/JSON/Markdown file          | File appears in file list; ingestion status shows processing then complete |
| FILE-02 | File chunking     | Upload a large file, check chunks             | File chunked; chunks visible in file detail view                           |
| FILE-03 | Attach to message | Attach file to a message via paperclip picker | File content included in AI context; AI can reference file contents        |
| FILE-04 | File list         | Navigate to Files page                        | All uploaded files listed with name, type, size, status                    |
| FILE-05 | Invalid file      | Upload unsupported file type                  | Error message; file not stored                                             |
| FILE-06 | Size limit        | Upload oversized file                         | Rejected with appropriate error message                                    |

**Evidence required**: Screenshots of file upload, file list, chunking status, and a chat message referencing file content.

---

## 7. Local Models (Ollama)

| ID       | Scenario      | Steps                           | Expected Outcome                                                         |
| -------- | ------------- | ------------------------------- | ------------------------------------------------------------------------ |
| MODEL-01 | View models   | Navigate to Models > Local page | All pulled Ollama models listed with name, size, parameters              |
| MODEL-02 | Model roles   | View role assignments           | Router, fallback, reasoning, coding roles assigned to appropriate models |
| MODEL-03 | Pull model    | Initiate pull of a new model    | Progress shown; model appears in list when complete                      |
| MODEL-04 | Generate test | Send test prompt to local model | Response generated; displayed correctly                                  |

**Evidence required**: Screenshots of model list, role assignments, and generation result.

---

## 8. Observability

| ID     | Scenario         | Steps                                     | Expected Outcome                                                        |
| ------ | ---------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| OBS-01 | Health dashboard | Navigate to health/observability page     | All 13 services show status (healthy/unhealthy); response times visible |
| OBS-02 | Audit logs       | Navigate to Audits page                   | Recent events listed: login, message, connector operations              |
| OBS-03 | Usage stats      | Navigate to usage view                    | Token usage, message counts, provider breakdown displayed               |
| OBS-04 | Client logs      | Navigate to Logs page, filter client logs | Frontend log entries visible with component, action, timestamp          |
| OBS-05 | Server logs      | Filter server logs by service             | Backend log entries visible with service name, module, action           |

**Evidence required**: Screenshots of health dashboard, audit log entries, and usage statistics.

---

## 9. Admin Functions

| ID       | Scenario        | Steps                                    | Expected Outcome                                                          |
| -------- | --------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| ADMIN-01 | User list       | Navigate to Admin page                   | All users listed with role, status, email                                 |
| ADMIN-02 | Create user     | Create new user with Operator role       | User appears in list; can log in with provided credentials                |
| ADMIN-03 | Change role     | Change user role from Operator to Viewer | Permissions updated immediately; user's UI reflects new role on next load |
| ADMIN-04 | Disable user    | Disable a user account                   | User cannot log in; existing sessions invalidated                         |
| ADMIN-05 | System settings | View/edit system settings                | Settings page shows configurable options; changes persist                 |

**Evidence required**: Screenshots of user list, create user form, and role change confirmation.

---

## 10. Internationalization

| ID      | Scenario        | Steps                               | Expected Outcome                                            |
| ------- | --------------- | ----------------------------------- | ----------------------------------------------------------- |
| I18N-01 | Language switch | Change language to German           | All UI text switches to German; no untranslated strings     |
| I18N-02 | RTL support     | Change language to Arabic           | Layout mirrors to RTL; text aligned right; sidebar on right |
| I18N-03 | All languages   | Switch through all 8 languages      | No missing translations; no layout breaks                   |
| I18N-04 | Persistence     | Set language to French, reload page | Language preference persists across sessions                |

**Evidence required**: Screenshots of the same page in English, Arabic (RTL), and one other language.

---

## 11. Settings and Preferences

| ID     | Scenario         | Steps                   | Expected Outcome                                              |
| ------ | ---------------- | ----------------------- | ------------------------------------------------------------- |
| SET-01 | Dark mode        | Toggle dark/light mode  | Theme switches; all components render correctly in both modes |
| SET-02 | Sidebar collapse | Collapse sidebar        | Sidebar minimizes; main content expands; state persists       |
| SET-03 | User preferences | Update user preferences | Changes saved; reflected on next page load                    |

**Evidence required**: Screenshots of dark mode and light mode on the same page.

---

## Known Limitations

These are known system limitations that should NOT be logged as defects during UAT:

1. **Cold start delay**: First Ollama request after container start takes 10-30 seconds (model loading).
2. **LOCAL_ONLY quality**: Local models (1-4B parameters) produce lower quality responses than cloud models.
3. **No real-time collaboration**: Threads are single-user; no shared/collaborative chat.
4. **File type limits**: Only text, CSV, JSON, and Markdown files supported for chunking.
5. **Browser limit**: Optimized for Chrome; minor visual differences possible in Firefox/Safari.
6. **Single instance**: No horizontal scaling; performance degrades under heavy concurrent usage.

---

## Regression Areas

When retesting after bug fixes, always verify these areas have not regressed:

1. **Login/logout flow** -- token handling is security-critical
2. **Message send/receive** -- core user journey
3. **Routing mode selection** -- must route to correct provider
4. **Connector health** -- affects routing decisions
5. **SSE streaming** -- fragile to proxy/CORS configuration changes
6. **i18n completeness** -- new text often misses translations
7. **Dark mode** -- CSS variable changes can break theme switching
8. **Sidebar navigation** -- layout changes can break responsive behavior

---

## Sign-Off Criteria

UAT is complete when:

- [ ] All Critical scenarios (AUTH, CHAT, ROUTE core flows) pass with evidence
- [ ] All High scenarios (connectors, memory, files) pass with evidence
- [ ] All Medium scenarios (observability, admin, i18n) pass or have documented exceptions
- [ ] No Critical or High severity defects remain open
- [ ] Medium severity defects have agreed remediation timeline
- [ ] Product owner has reviewed evidence and approved
- [ ] Regression areas verified after final bug fixes
