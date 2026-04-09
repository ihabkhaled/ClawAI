# ClawAI User Journeys

This document describes the key user journeys through the ClawAI platform. Each journey includes step-by-step flows, happy paths, error paths, and the UI context for each step.

---

## 1. First-Time Setup

**Persona:** IT Administrator (ADMIN role)
**Goal:** Install ClawAI, configure at least one AI provider connector, and verify the system works with a test conversation.

### Happy Path

1. **Run the installer.** Execute `scripts/install.ps1` (Windows) or `scripts/install.sh` (Linux/macOS). The script generates the `.env` file with default values, pulls Docker images, and starts all containers.

2. **Verify services are running.** Open the Observability page or run `./scripts/claw.sh status`. All 11 backend services, databases, RabbitMQ, Redis, and Ollama should report healthy. The Ollama service auto-pulls 5 local models (gemma3:4b, llama3.2:3b, phi3:mini, gemma2:2b, tinyllama) on first startup.

3. **Log in with the default admin account.** Navigate to `http://localhost:3000/login`. Enter the default admin credentials (configured in .env as ADMIN_EMAIL and ADMIN_PASSWORD). The system returns JWT tokens and redirects to the Dashboard.

4. **Add a cloud AI connector.** Navigate to the Connectors page. Click "Add Connector." Fill in:
   - Name: "OpenAI Production"
   - Provider: OpenAI
   - Auth Type: API_KEY
   - API Key: (paste the OpenAI API key)
     Click "Save."

5. **Test the connector.** On the connector detail page, click "Test Connection." The system makes a test API call. A green success indicator confirms the connection works.

6. **Sync models.** Click "Sync Models." The system fetches available models from OpenAI and stores them in the database. The model list populates with entries like gpt-4o, gpt-4o-mini.

7. **Send a test message.** Navigate to the Chat page. Click "New Thread." Leave routing mode as AUTO. Type "Hello, can you confirm you are working?" and send. The system routes to the best available provider and returns a response. The routing transparency badge shows which provider was used.

8. **Create team accounts.** Navigate to the Admin page. Create user accounts for team members with appropriate roles (OPERATOR for regular users, VIEWER for read-only access).

### Error Paths

| Step | Error                           | Resolution                                                                                                                                                            |
| ---- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Docker not installed            | Install Docker Desktop. Re-run the installer.                                                                                                                         |
| 1    | Port conflict (3000, 4000-4011) | Stop conflicting services or change ports in .env.                                                                                                                    |
| 2    | Ollama service unhealthy        | Verify Ollama is installed and running at OLLAMA_BASE_URL. Check Docker logs for the ollama container.                                                                |
| 2    | Model pull fails                | Check internet connectivity. Verify disk space (models require 2-10GB). Models can be manually pulled later via the Models page.                                      |
| 3    | Login fails                     | Verify ADMIN_EMAIL and ADMIN_PASSWORD in .env match the seeded admin account. Check auth-service logs.                                                                |
| 4    | Connector creation fails        | Verify the provider enum value matches exactly. Check connector-service logs for validation errors.                                                                   |
| 5    | Test connection fails           | Verify the API key is valid and has sufficient quota. Check that outbound HTTPS is not blocked by a firewall.                                                         |
| 6    | Sync returns 0 models           | Some providers require specific API permissions to list models. Check the provider's dashboard for API access settings.                                               |
| 7    | Message gets no response        | Check routing-service logs for routing failures. Verify at least one connector is healthy. If using local models only, verify Ollama health at /api/v1/ollama/health. |

### Screenshot Context

- **Step 3:** Login page with email/password fields and a "Sign In" button.
- **Step 4:** Connectors page showing an empty state with a prominent "Add Connector" button. The form includes fields for name, provider dropdown, auth type dropdown, API key input (password masked), and optional base URL.
- **Step 5-6:** Connector detail page with "Test Connection" and "Sync Models" action buttons, and a model list table below.
- **Step 7:** Chat page with a message composer at the bottom, model selector dropdown, and the thread messages area showing the user message and AI response with a routing transparency badge.

---

## 2. Daily Chat Workflow

**Persona:** Developer (OPERATOR role)
**Goal:** Have a productive conversation with the most appropriate AI model.

### Happy Path

1. **Open ClawAI.** Navigate to `http://localhost:3000`. The Dashboard shows recent threads, quick stats, and system status.

2. **Resume or create a thread.** Either click on an existing thread from the sidebar/dashboard, or click "New Thread" to start a fresh conversation.

3. **Configure the thread (optional).** Open Thread Settings to adjust:
   - Routing mode (default: AUTO)
   - System prompt (e.g., "You are a NestJS expert")
   - Temperature (e.g., 0.3 for deterministic code)
   - Max tokens (e.g., 4000 for longer responses)
   - Preferred model (e.g., force Claude Sonnet 4)
   - Attach context packs (e.g., "Project Coding Standards")

4. **Send a message.** Type in the message composer. Optionally attach files using the paperclip icon. Click send or press Enter.

5. **Wait for the response.** A thinking indicator appears. The SSE connection receives the completion event. The AI response appears in the thread with:
   - Provider/model badge (e.g., "Anthropic / claude-sonnet-4")
   - Token counts (input/output)
   - Latency display
   - Routing transparency expandable (confidence, reason tags, privacy/cost class)

6. **Iterate.** Read the response. If unsatisfactory, click "Regenerate" to get a new response. Provide feedback (thumbs up/down). Send follow-up messages to refine the conversation.

7. **End the session.** The thread is automatically saved. Return later to resume the conversation with full history.

### Error Paths

| Step | Error                             | Resolution                                                                                                                      |
| ---- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 4    | "Content must not be empty"       | Enter at least 1 character in the message field.                                                                                |
| 4    | File attachment fails             | Verify the file was successfully uploaded and ingested (check Files page for ingestionStatus).                                  |
| 5    | Thinking indicator never resolves | Check for SSE connection issues. Refresh the page to re-establish the connection. Check chat-service logs for execution errors. |
| 5    | LLM_EXECUTION_FAILED error        | All providers failed. Check connector health, verify API keys have quota remaining, or switch to LOCAL_ONLY mode.               |
| 5    | CONNECTOR_CONFIG_FETCH_FAILED     | The chat service could not reach the connector service. Check connector-service health.                                         |
| 6    | Regenerate returns same response  | The model may produce deterministic output at low temperature. Try increasing temperature in Thread Settings.                   |

### Screenshot Context

- **Step 2:** Sidebar showing thread list with titles and timestamps. "New Thread" button at the top.
- **Step 3:** Thread Settings panel (slide-out or modal) with form fields for all thread configuration options.
- **Step 4:** Message composer with textarea, send button, model selector dropdown, and file attachment paperclip icon.
- **Step 5:** Message bubble showing the AI response with provider badge, token counts, and an expandable routing transparency section.

---

## 3. Routing Configuration

**Persona:** IT Administrator (ADMIN role)
**Goal:** Create and test routing policies to optimize model selection for the organization.

### Happy Path

1. **Navigate to the Routing page.** The page shows existing policies in a table with name, routing mode, priority, and active status.

2. **Create a new policy.** Click "Create Policy." Fill in:
   - Name: "Route coding to Anthropic" (max 255 chars)
   - Routing mode: AUTO
   - Priority: 100 (higher priority overrides lower)
   - Config: `{"taskTypes": ["coding", "debugging"], "preferredProvider": "anthropic", "preferredModel": "claude-sonnet-4"}`
     Click "Save."

3. **Test the policy.** Click "Evaluate Route" to open the test panel. Enter a sample message like "Review this Python function for bugs." Submit the evaluation. The result shows:
   - Selected provider: anthropic
   - Selected model: claude-sonnet-4
   - Confidence: 0.92
   - Reason tags: ["coding", "code_review"]
   - Privacy class: CLOUD
   - Cost class: STANDARD

4. **Review decision history.** Select a thread from the decision history view. Browse the routing decisions for each message, confirming that the new policy is being applied correctly.

5. **Adjust policies.** If the evaluation results are unexpected, adjust the policy's priority or config. Delete or update policies that are no longer relevant.

### Error Paths

| Step | Error                               | Resolution                                                                                                                        |
| ---- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 2    | Validation error on create          | Ensure name is 1-255 characters, priority is 0-1000, and config is valid JSON.                                                    |
| 3    | Evaluation returns unexpected model | Check policy priorities. A higher-priority policy may be overriding. Review all active policies.                                  |
| 3    | Evaluation times out                | The Ollama router model may be unavailable. Check Ollama health. The system falls back to heuristic routing on timeout.           |
| 4    | No decisions for thread             | Decisions are only recorded for messages processed through the routing service. Verify the thread has messages with AI responses. |

### Screenshot Context

- **Step 1:** Routing page with a policies table and a "Create Policy" button.
- **Step 3:** Evaluate panel with a text input for the sample message and a results display showing the routing decision breakdown.
- **Step 4:** Decision history table showing threadId, message content preview, selected provider/model, confidence, and reason tags.

---

## 4. File Analysis

**Persona:** Data Analyst (OPERATOR role)
**Goal:** Upload a data file and ask the AI to analyze its contents.

### Happy Path

1. **Upload the file.** Navigate to the Files page. Click "Upload File." Select a CSV file (e.g., `quarterly_revenue.csv`, 2MB). The upload begins and the file appears in the list with status "Uploading."

2. **Wait for ingestion.** The ingestion status changes from "Uploading" to "Processing" to "Ready." The system chunks the CSV into manageable segments stored as FileChunk records.

3. **Create a chat thread.** Navigate to Chat. Create a new thread with:
   - Title: "Q3 Revenue Analysis"
   - Routing mode: AUTO (Gemini is preferred for data analysis)
   - System prompt: "You are a data analyst. Provide insights with specific numbers from the data."

4. **Attach the file.** In the message composer, click the paperclip icon. The file picker shows all uploaded files with their ingestion status. Select the CSV file (only files with "Ready" status can be attached).

5. **Ask analysis questions.** Send: "Summarize the key revenue trends in this dataset. Identify the top 3 performing regions."

6. **Review the AI response.** The AI response references specific data from the file chunks. The routing transparency shows the message was routed to Gemini (best for file/data analysis).

7. **Follow up.** Send follow-up questions: "What is the month-over-month growth rate for the top region?" The thread history and file context persist across messages.

8. **Generate a report.** Ask: "Generate a summary report of the key findings." The system may produce a file generation if the response warrants it.

### Error Paths

| Step | Error                           | Resolution                                                                                                                                      |
| ---- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | INVALID_MIME_TYPE               | Only JSON, CSV, Markdown, and plain text files are supported. Convert the file to a supported format.                                           |
| 1    | FILE_TOO_LARGE                  | File exceeds the 50MB limit. Split the file or reduce its size.                                                                                 |
| 2    | Ingestion stuck in "Processing" | Check file-service logs. The file may have an unsupported internal format despite having a valid MIME type.                                     |
| 4    | File not shown in picker        | Verify the file's ingestion status is "Ready." Files still processing cannot be attached.                                                       |
| 5    | AI does not reference file data | The file may have too many chunks for the token budget. The context assembly truncates from tail to fit. Consider splitting into smaller files. |

### Screenshot Context

- **Step 1:** Files page with an upload area (drag-and-drop or click), and a table showing existing files with filename, size, type, and ingestion status.
- **Step 4:** File attachment picker (popover from the paperclip icon) showing file checkboxes with names and status indicators.
- **Step 6:** AI response message with data insights, and a routing transparency badge showing Gemini was used.

---

## 5. Memory Management

**Persona:** Privacy-Conscious User (OPERATOR role)
**Goal:** Review automatically extracted memories, disable sensitive ones, and curate context packs.

### Happy Path

1. **Review extracted memories.** Navigate to the Memory page. The list shows all memories extracted from conversations, sorted by most recent. Each entry shows type (FACT/PREFERENCE/INSTRUCTION/SUMMARY), content, source thread, and enabled/disabled status.

2. **Filter by type.** Use the type filter to view only FACT memories. Review each one for accuracy and sensitivity.

3. **Disable a sensitive memory.** Find a memory containing sensitive information (e.g., "User works on Project X with client Y"). Click the toggle to disable it. The memory remains in the list but is excluded from future context assembly.

4. **Edit an inaccurate memory.** Find a memory with incorrect information. Click "Edit." Update the content to be accurate. Save.

5. **Delete a memory.** Find a memory that should not exist at all. Click "Delete." Confirm the deletion. The memory is permanently removed.

6. **Create a manual memory.** Click "Create Memory." Select type INSTRUCTION. Enter: "Always respond in formal English. Never use slang or abbreviations." Save. This instruction will be included in all future conversation contexts.

7. **Build a context pack.** Navigate to the Context Packs page. Click "Create Pack." Name it "Legal Standards." Add items:
   - Type: TEXT, Content: "All legal documents must follow ABA citation format."
   - Type: TEXT, Content: "Confidentiality provisions must be reviewed before sharing any analysis."
     Save the pack.

8. **Attach to a thread.** Open or create a chat thread. In Thread Settings, select the "Legal Standards" context pack from the context packs selector. All items from the pack will be included in every message's context.

### Error Paths

| Step | Error                           | Resolution                                                                                        |
| ---- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| 3    | FORBIDDEN_MEMORY_ACCESS         | This memory belongs to another user. Memories are user-scoped; you can only manage your own.      |
| 4    | Validation error on update      | Content must be 1-50,000 characters. Type must be a valid MemoryType enum value.                  |
| 6    | Memory not appearing in context | Verify the memory's isEnabled flag is true. Disabled memories are excluded from context assembly. |
| 7    | FORBIDDEN_CONTEXT_PACK_ACCESS   | Context packs are user-scoped. You can only manage your own packs.                                |

### Screenshot Context

- **Step 1:** Memory page with a table showing type badge, content preview (truncated), source thread link, timestamp, and an enable/disable toggle.
- **Step 3:** Toggle switch that visually dims the memory entry when disabled.
- **Step 7:** Context Packs page with a pack creation form (name, description) and an items list where items can be added with type dropdown and content textarea.

---

## 6. Image Generation

**Persona:** Developer (OPERATOR role)
**Goal:** Generate an image from a text description and iterate on the result.

### Happy Path

1. **Start a chat thread.** Create or open a thread with AUTO routing mode.

2. **Describe the image.** Send: "Generate an image of a futuristic city skyline at sunset with flying cars and neon lights."

3. **Routing to image provider.** AUTO mode detects the image generation intent and routes to an image-capable provider (e.g., Gemini). The routing transparency shows the image provider was selected.

4. **Wait for generation.** The message shows "Generating image..." with a progress indicator. The SSE endpoint streams status updates from the image service.

5. **View the result.** The generated image appears in the thread as part of the ASSISTANT message. The image generation details (provider, model, dimensions) are available.

6. **Retry if unsatisfied.** If the image does not match expectations:
   - Click "Retry" to regenerate with the same prompt and provider.
   - Click "Try alternate" to use a different image model.

7. **View generation history.** Navigate to the Images section to see all past generations with their prompts, statuses, and results.

### Error Paths

| Step | Error                                 | Resolution                                                                                                                                    |
| ---- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 3    | Routes to text model instead of image | The AUTO router may not detect image intent. Rephrase with clearer intent (e.g., "Create a picture of...") or select an image model manually. |
| 4    | Generation times out                  | The image provider may be slow or unavailable. Try retrying, or use an alternate provider.                                                    |
| 6    | NO_ALTERNATE_MODEL                    | No other image-capable model is available. Configure an additional connector with image generation support.                                   |
| 4    | UNSUPPORTED_IMAGE_PROVIDER            | The selected provider does not support image generation. Switch to a provider with image capability.                                          |

### Screenshot Context

- **Step 4:** Thinking indicator with "Generating image..." text and a progress bar.
- **Step 5:** Message bubble containing the generated image, with provider badge and generation details.
- **Step 6:** Retry and "Try alternate" buttons below the generated image.

---

## 7. Connector Management

**Persona:** IT Administrator (ADMIN role)
**Goal:** Add a new AI provider, configure it, and verify it works.

### Happy Path

1. **Navigate to Connectors.** The page lists all configured connectors with name, provider, status, and model count.

2. **Click "Add Connector."** The creation form opens.

3. **Fill in connector details:**
   - Name: "Anthropic Production"
   - Provider: ANTHROPIC (from dropdown)
   - Auth Type: API_KEY
   - API Key: (paste the Anthropic API key; stored with AES-256-GCM encryption)
   - Base URL: (leave default for standard providers)

4. **Save the connector.** The system creates the connector record and returns to the connector detail page.

5. **Test the connection.** Click "Test Connection." The system makes a lightweight API call to verify the key. Green checkmark indicates success.

6. **Sync models.** Click "Sync Models." The system fetches available models from Anthropic's API:
   - claude-sonnet-4 (streaming: yes, tools: yes, vision: yes)
   - claude-opus-4 (streaming: yes, tools: yes, vision: yes)
     The models appear in the connector's model list.

7. **Verify in chat.** Go to the Chat page. Open the model selector. The Anthropic models now appear in the "Anthropic" group. Select one and send a test message.

8. **Monitor health.** Return to the Connectors page periodically. The health status column shows the last check result. Health checks are also visible in the Health dashboard.

### Error Paths

| Step | Error                                    | Resolution                                                                                                                          |
| ---- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 3    | "Name is required"                       | Name field must be 1-100 characters.                                                                                                |
| 3    | "API key must be at most 500 characters" | Some providers have long keys. If the key exceeds 500 characters, contact support or configure via base URL.                        |
| 5    | Test returns failure                     | Verify the API key is correct, has not expired, and has sufficient permissions. Check that the base URL is correct for your region. |
| 6    | Sync returns 0 models                    | The API key may not have permission to list models. Check provider documentation for required scopes.                               |
| 6    | Sync fails with network error            | Verify outbound HTTPS connectivity to the provider's API endpoint. Check for proxy or firewall restrictions.                        |

### Screenshot Context

- **Step 1:** Connectors page with a table of connectors showing name, provider icon, status badge, model count, and last health check time.
- **Step 3:** Connector creation form with provider dropdown, name input, auth type selector, API key masked input, and base URL input.
- **Step 5-6:** Connector detail page with "Test" and "Sync" buttons, status indicators, and a model list table showing model name, capabilities, and lifecycle.

---

## 8. Admin Workflow

**Persona:** Team Lead (ADMIN role)
**Goal:** Manage team members, review usage, and ensure compliance.

### Happy Path

1. **Onboard a new team member.** Navigate to Admin > Users. Click "Create User." Fill in:
   - Email: developer@company.com
   - Username: developer
   - Password: (temporary, mustChangePassword flag will be set)
   - Role: OPERATOR
     Save. Share credentials with the new team member.

2. **Review audit logs.** Navigate to the Audits page. Filter by date range (this week). Review the event log:
   - user.login events showing team activity
   - message.completed events showing AI usage
   - routing.decision_made events showing model selection patterns
   - connector.health_checked events showing provider status

3. **Check usage and costs.** Navigate to the Usage page. Review:
   - Total token consumption by provider
   - Cost breakdown (which providers are most expensive)
   - Latency summary (which providers are fastest)
   - Identify if any provider is being overused relative to others

4. **Optimize routing.** Based on usage data, navigate to the Routing page. Adjust policies:
   - Lower priority of expensive providers for simple queries
   - Create a COST_SAVER policy for non-critical chat threads
   - Ensure coding tasks still route to the best provider (Anthropic)

5. **Handle a departing team member.** Navigate to Admin > Users. Find the departing user. Click "Deactivate." Their account is disabled and they can no longer log in. Their conversation history and memories remain intact.

6. **Promote a team member.** Navigate to Admin > Users. Find a senior developer. Click "Change Role." Select ADMIN. The user now has full administrative access.

7. **Review system health.** Navigate to the Observability page. Check:
   - All services showing green health status
   - No elevated error rates in client or server logs
   - Ollama runtime is healthy and all 5 models are loaded

### Error Paths

| Step | Error                             | Resolution                                                                                                                        |
| ---- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1    | DUPLICATE_ENTITY                  | A user with this email already exists. Use a different email or reactivate the existing account.                                  |
| 1    | User cannot log in after creation | Verify the account status is ACTIVE. Check that the password meets requirements.                                                  |
| 5    | Cannot deactivate self            | The system prevents self-deactivation. Another admin must deactivate your account if needed.                                      |
| 6    | Cannot change own role            | The system prevents self-role-change. Another admin must change your role.                                                        |
| 7    | Service showing unhealthy         | Check Docker container status for the specific service. Review server logs for error details. Restart the container if necessary. |

### Screenshot Context

- **Step 1:** Admin users page with a user table (email, username, role badge, status badge, last login) and a "Create User" button.
- **Step 2:** Audits page with a filterable table showing timestamp, action, user, entity, severity badge, and details expandable.
- **Step 3:** Usage dashboard with charts showing token consumption by provider, cost breakdown pie chart, and latency percentile bar chart.
- **Step 5:** User detail page with "Deactivate" button (red, with confirmation dialog).
