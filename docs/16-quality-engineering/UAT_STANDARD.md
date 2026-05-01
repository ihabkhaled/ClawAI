# UAT (User Acceptance Testing) Standard

> ClawAI Quality Engineering -- Document 10 of 10

## Purpose

UAT validates that a feature meets the real business intent -- not just the technical specification. A feature can pass all unit, integration, and system tests yet still fail UAT because it does not solve the user's actual problem, is confusing to use, or behaves unexpectedly at the edges.

UAT is the final gate before a feature is considered "done." It is performed from the user's perspective, not the engineer's.

---

## 1. UAT Personas

Each feature must be tested through the lens of at least two personas. The persona determines what the tester focuses on.

### 1.1 Developer Persona

**Who:** A software engineer using ClawAI for coding assistance.

**Priorities:**

- Fast routing to coding-specialized models (Qwen 2.5 Coder, DeepSeek Coder)
- Accurate code generation with correct syntax and logic
- File attachment (code files, CSVs) works for context
- Parallel compare lets them evaluate multiple model responses
- Thread settings (temperature, model selection) are easy to adjust

**UAT focus areas:**

- Send a coding question in AUTO mode. Does it route to a coding model?
- Attach a code file. Does the response reference the file content correctly?
- Use parallel compare with 2-3 models. Can you easily compare results side by side?
- Switch to LOCAL_ONLY mode. Does the response come from a local coding model?
- How long does it take from sending a message to seeing the first response token?

### 1.2 Data Scientist Persona

**Who:** A researcher working with sensitive data who needs privacy guarantees.

**Priorities:**

- Privacy-first routing (sensitive queries never leave the local machine)
- Memory extraction captures important analysis context
- File upload handles CSV/JSON data files correctly
- Context packs let them group related reference materials

**UAT focus areas:**

- Send a privacy-sensitive query (e.g., "Analyze this patient data"). Does it stay local?
- Upload a CSV file and ask for analysis. Does the response reference the actual data?
- Check memory records after a session. Were useful facts extracted?
- Create a context pack with reference documents. Does it affect future responses?
- Switch to PRIVACY_FIRST mode. Verify the routing badge always shows a local model.

### 1.3 Team Lead Persona

**Who:** An administrator managing ClawAI for a team.

**Priorities:**

- User management (create accounts, assign roles)
- Audit trail (who did what, when)
- Usage statistics (token consumption, cost tracking)
- Connector management (configure cloud providers)
- System health visibility

**UAT focus areas:**

- Create a new user with OPERATOR role. Can they log in and access appropriate pages?
- Change a user's role from OPERATOR to VIEWER. Are their permissions immediately restricted?
- View audit logs. Can you filter by user, action, and date range?
- View usage statistics. Are token counts accurate and broken down by provider?
- Check system health dashboard. Does it reflect the actual state of all services?

### 1.4 New User Persona

**Who:** Someone using ClawAI for the first time, with no prior context.

**Priorities:**

- Intuitive first-time experience
- Clear navigation and labeling
- Helpful empty states and guidance
- Error messages that explain what to do (not just what went wrong)
- Settings are discoverable and self-explanatory

**UAT focus areas:**

- Starting from the login page, can you figure out how to send your first message without reading documentation?
- Are empty states (no threads, no connectors, no models) helpful rather than blank?
- If something goes wrong (network error, model unavailable), does the error message tell you what to do?
- Can you find and change the language/theme without help?
- Is the model catalog understandable? Can you tell which model to download for your use case?

---

## 2. UAT Questions Per Feature

For every new feature, the UAT tester must answer all of the following questions. Any "no" is a blocker.

### 2.1 Business Value

| #   | Question                                                               | Pass Criteria                                                        |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| BV1 | Does the feature solve the stated business problem?                    | The feature achieves its intended goal without workarounds           |
| BV2 | Would a user discover and use this feature naturally?                  | Feature is accessible via obvious navigation or contextual triggers  |
| BV3 | Is the feature useful in its current state, or does it need more work? | The feature delivers value on its own (not dependent on future work) |

### 2.2 Usability

| #   | Question                                          | Pass Criteria                                         |
| --- | ------------------------------------------------- | ----------------------------------------------------- |
| US1 | Is the flow understandable without documentation? | A new user can complete the task without instructions |
| US2 | Are labels, buttons, and actions clearly named?   | No ambiguous or technical jargon in the UI            |
| US3 | Is the number of clicks/steps reasonable?         | No unnecessary steps; common paths are short          |
| US4 | Does the feature follow existing UI patterns?     | Consistent with the rest of ClawAI's interface        |

### 2.3 Error Handling

| #   | Question                                                 | Pass Criteria                                                        |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| EH1 | Are error messages helpful and actionable?               | Each error tells the user what happened AND what to do about it      |
| EH2 | Does the feature recover gracefully from errors?         | After an error, the user can retry or navigate away cleanly          |
| EH3 | Are validation errors shown inline (not just as toasts)? | Form fields highlight errors near the problematic input              |
| EH4 | Does the feature handle missing dependencies?            | If a service is down, the error is user-friendly (not a stack trace) |

### 2.4 Performance

| #   | Question                                                                              | Pass Criteria                                                                  |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| PF1 | Is the UI response time acceptable (< 3 seconds for navigation/CRUD)?                 | Pages load, forms submit, and lists render within 3 seconds                    |
| PF2 | Is the LLM response time acceptable (< 30 seconds for cloud, < 60 seconds for local)? | User sees "thinking" indicator immediately, response arrives within threshold  |
| PF3 | Are loading states shown for every async operation?                                   | The user always knows something is happening (no blank screens during loading) |
| PF4 | Does the feature work with large datasets?                                            | 100+ threads, 1000+ messages, 50+ files -- no UI freezing or crashes           |

### 2.5 Edge Behavior

| #   | Question                                                   | Pass Criteria                                                                           |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| EB1 | Are edge behaviors acceptable from the user's perspective? | Empty input, very long input, special characters, rapid clicking -- all handled         |
| EB2 | Does the feature behave correctly with no data?            | Empty states provide guidance, not blank screens                                        |
| EB3 | Does the feature behave correctly with maximum data?       | Pagination, truncation, or scrolling handles large data sets                            |
| EB4 | Would a user trust the results?                            | AI responses are presented with appropriate context (model, confidence, routing reason) |

### 2.6 Graceful Degradation

| #   | Question                                     | Pass Criteria                                                                          |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| GD1 | What happens when Ollama is down?            | Chat falls back to cloud providers; model catalog shows "offline"                      |
| GD2 | What happens when a cloud connector is down? | Routing falls back to next provider; error is clear to user                            |
| GD3 | What happens when RabbitMQ is down?          | Synchronous operations still work; async features show "temporarily unavailable"       |
| GD4 | What happens when the network is slow?       | Loading states persist, no duplicate submissions, timeouts have user-friendly messages |

---

## 3. UAT Checklist

Every feature must pass this checklist before sign-off. The tester marks each item pass/fail with notes.

### 3.1 Happy Path

| #   | Check                                                  | Status | Notes |
| --- | ------------------------------------------------------ | ------ | ----- |
| HP1 | Primary use case works end-to-end                      |        |       |
| HP2 | Secondary use cases work                               |        |       |
| HP3 | Data created by the feature is visible in the UI       |        |       |
| HP4 | Data created by the feature is correct in the database |        |       |
| HP5 | Related features still work (adjacency check)          |        |       |

### 3.2 Error Paths

| #   | Check                                                        | Status | Notes |
| --- | ------------------------------------------------------------ | ------ | ----- |
| EP1 | Invalid input shows validation error                         |        |       |
| EP2 | Missing required fields are highlighted                      |        |       |
| EP3 | Server errors show user-friendly message                     |        |       |
| EP4 | Network timeout shows retry option                           |        |       |
| EP5 | Unauthorized access shows meaningful error (not raw 401/403) |        |       |

### 3.3 Loading and Feedback

| #   | Check                                                             | Status | Notes |
| --- | ----------------------------------------------------------------- | ------ | ----- |
| LF1 | Loading spinner/skeleton shown during data fetch                  |        |       |
| LF2 | "AI is thinking" indicator shown during LLM processing            |        |       |
| LF3 | Success feedback shown after create/update/delete                 |        |       |
| LF4 | Progress indicator shown for long operations (downloads, uploads) |        |       |

### 3.4 Empty States

| #   | Check                                                                  | Status | Notes |
| --- | ---------------------------------------------------------------------- | ------ | ----- |
| ES1 | Empty list shows helpful message (not blank)                           |        |       |
| ES2 | Empty state includes call-to-action (e.g., "Create your first thread") |        |       |
| ES3 | Search with no results shows "No results" message                      |        |       |
| ES4 | Filter with no matches shows "No matches" message                      |        |       |

### 3.5 Data Persistence

| #   | Check                                                       | Status | Notes |
| --- | ----------------------------------------------------------- | ------ | ----- |
| DP1 | Data survives page refresh                                  |        |       |
| DP2 | Data survives browser close and reopen (with valid session) |        |       |
| DP3 | Settings persist across sessions                            |        |       |
| DP4 | Theme preference persists                                   |        |       |
| DP5 | Language preference persists                                |        |       |
| DP6 | Sidebar state (collapsed/expanded) persists                 |        |       |

### 3.6 Theme and Internationalization

| #   | Check                                                          | Status | Notes |
| --- | -------------------------------------------------------------- | ------ | ----- |
| TI1 | Feature works in light mode                                    |        |       |
| TI2 | Feature works in dark mode                                     |        |       |
| TI3 | Feature text is translated in English (base)                   |        |       |
| TI4 | Spot-check: feature text correct in at least 2 other languages |        |       |
| TI5 | Arabic (RTL) layout is correct                                 |        |       |
| TI6 | No hardcoded text visible in the UI                            |        |       |

---

## 4. UAT Execution Process

### 4.1 Before UAT

1. **Feature is code-complete.** All unit, integration, and regression tests pass.
2. **Feature is deployed** to the test environment (Docker Compose stack running).
3. **Test data is seeded.** Admin user, connectors, and models are available.
4. **UAT tester is briefed.** They have the feature description, acceptance criteria, and this checklist.

### 4.2 During UAT

1. Tester selects **at least 2 personas** relevant to the feature.
2. Tester works through the **UAT questions** (section 2) for each persona.
3. Tester completes the **UAT checklist** (section 3), marking each item pass/fail with notes.
4. Any failure is logged with:
   - **What happened** (exact steps to reproduce)
   - **What was expected** (the correct behavior)
   - **What actually happened** (the incorrect behavior)
   - **Screenshot or video** (if applicable)
   - **Severity**: blocker (cannot ship), major (must fix before ship), minor (can ship, fix later)

### 4.3 After UAT

1. **All blockers** must be fixed and re-tested before sign-off.
2. **All major issues** must be fixed or have a documented plan with timeline.
3. **Minor issues** are logged for future sprints.
4. **Sign-off** requires approval from all three roles:

---

## 5. UAT Sign-Off

### Sign-Off Authority

| Role                     | Responsibility                                                   |
| ------------------------ | ---------------------------------------------------------------- |
| Feature Owner (Engineer) | Confirms all technical issues from UAT are resolved              |
| QA Lead                  | Confirms all checklist items pass, regressions are clean         |
| Product Representative   | Confirms the feature meets business intent and user expectations |

### Sign-Off Template

```
Feature: [Feature Name]
Date: [YYYY-MM-DD]
Environment: [Docker Compose / Staging / Production]

UAT Summary:
  - Total checks: [number]
  - Passed: [number]
  - Failed (blocker): [number]
  - Failed (major): [number]
  - Failed (minor): [number]

Personas tested:
  - [x] Developer
  - [x] Data Scientist
  - [ ] Team Lead
  - [x] New User

Outstanding issues:
  - [Issue description] -- [severity] -- [status]

Sign-off:
  - Feature Owner: [Name] -- [Approved/Rejected] -- [Date]
  - QA Lead: [Name] -- [Approved/Rejected] -- [Date]
  - Product Rep: [Name] -- [Approved/Rejected] -- [Date]
```

---

## 6. Feature-Specific UAT Guides

### 6.1 Chat Feature UAT

| Step | Action                                     | Verify                                                  |
| ---- | ------------------------------------------ | ------------------------------------------------------- |
| 1    | Create a new chat thread                   | Thread appears in sidebar with default title            |
| 2    | Send "Write a Python quicksort"            | Routing badge shows coding model                        |
| 3    | Wait for response                          | Response contains valid Python code                     |
| 4    | Send "Translate this to Rust"              | Response correctly translates the previous code         |
| 5    | Open thread settings                       | Temperature, system prompt, model selector visible      |
| 6    | Change model to a specific provider/model  | Next message uses the selected model                    |
| 7    | Send "My favorite language is Go"          | After 30s, check memories page for extracted preference |
| 8    | Upload a CSV file                          | File appears in attachment list                         |
| 9    | Send "Summarize this file" with attachment | Response references file content                        |
| 10   | Click regenerate on assistant message      | New response generated, original preserved              |

### 6.2 Model Catalog UAT

| Step | Action                                             | Verify                                                 |
| ---- | -------------------------------------------------- | ------------------------------------------------------ |
| 1    | Navigate to /models/catalog                        | Grid of 30 model cards displayed                       |
| 2    | Filter by "Coding" category                        | Only coding models shown                               |
| 3    | Search for "DeepSeek"                              | Matching models highlighted/filtered                   |
| 4    | Click download on a small model                    | Progress bar appears, active downloads panel shows job |
| 5    | Wait for download to complete                      | Model card shows "Installed" badge                     |
| 6    | Cancel a download in progress                      | Download stops, partial data cleaned up                |
| 7    | Navigate to /models/local                          | Downloaded model appears in installed list             |
| 8    | Assign a role to the model                         | Role badge shown, model available for that role        |
| 9    | Send a chat message that should route to that role | Routing decision uses the new model                    |

### 6.3 Routing UAT

| Step | Action                                                    | Verify                               |
| ---- | --------------------------------------------------------- | ------------------------------------ |
| 1    | Send "Write a Docker Compose file" in AUTO mode           | Routes to coding model               |
| 2    | Send "Analyze this medical data" in AUTO mode             | Routes to local model (privacy)      |
| 3    | Send "Hello, how are you?" in AUTO mode                   | Routes to chat model                 |
| 4    | Send "Create a marketing budget spreadsheet" in AUTO mode | Routes to file generation model      |
| 5    | Switch thread to MANUAL_MODEL, select specific model      | Next message uses exact model        |
| 6    | Switch thread to LOCAL_ONLY                               | All responses from local Ollama      |
| 7    | Navigate to routing replay lab                            | Historical decisions displayed       |
| 8    | Run replay on a set of decisions                          | Comparison shows old vs. new routing |

### 6.4 Admin UAT

| Step | Action                                       | Verify                                          |
| ---- | -------------------------------------------- | ----------------------------------------------- |
| 1    | Login as ADMIN, navigate to /admin           | User list visible                               |
| 2    | Create a new user with OPERATOR role         | User appears in list                            |
| 3    | Login as new OPERATOR in a different browser | Dashboard accessible, /admin not accessible     |
| 4    | Back as ADMIN, change the user to VIEWER     | Role change saved                               |
| 5    | As VIEWER, try to send a chat message        | Send is disabled (read-only)                    |
| 6    | As ADMIN, view audit logs                    | All actions (user creation, role change) logged |
| 7    | Filter audit logs by the new user            | Only that user's actions shown                  |

---

## 7. Performance Benchmarks for UAT

| Operation                             | Maximum Acceptable Time |
| ------------------------------------- | ----------------------- |
| Page load (any page)                  | 3 seconds               |
| Login                                 | 2 seconds               |
| Thread list load                      | 2 seconds               |
| Send message (until "thinking" shows) | 1 second                |
| LLM response (cloud provider)         | 30 seconds              |
| LLM response (local Ollama)           | 60 seconds              |
| File upload (< 10MB)                  | 5 seconds               |
| Model catalog load                    | 3 seconds               |
| Connector sync                        | 15 seconds              |
| Settings save                         | 2 seconds               |
| Audit log query                       | 5 seconds               |
| Theme/language switch                 | Instant (< 500ms)       |

If any operation exceeds its threshold, it is a **major** UAT finding.

---

## 8. UAT Environment Checklist

Before starting UAT, verify the environment is ready:

| #   | Check                                 | Command                                           |
| --- | ------------------------------------- | ------------------------------------------------- |
| 1   | All containers running                | `./scripts/claw.sh ps`     |
| 2   | All services healthy                  | `curl http://localhost:4000/api/v1/health`        |
| 3   | Admin user exists                     | Login at http://localhost:3000/login              |
| 4   | At least one connector configured     | Check /connectors page                            |
| 5   | Ollama models pulled                  | `curl http://localhost:11434/api/tags`            |
| 6   | Model catalog seeded                  | Check /models/catalog page                        |
| 7   | No errors in service logs             | `docker compose logs --since 5m \| grep -i error` |
| 8   | Frontend accessible                   | Open http://localhost:3000 in browser             |
| 9   | Test data present (threads, messages) | Optional -- for testing with pre-existing data    |
| 10  | All 8 language files present          | Check /settings language dropdown                 |
