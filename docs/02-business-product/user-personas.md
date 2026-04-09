# ClawAI User Personas

This document defines the primary user personas for ClawAI. Each persona represents a distinct category of user with specific goals, pain points, and workflows. These personas inform feature prioritization, UX design, and acceptance criteria.

---

## 1. IT Administrator

**Name:** Farid, Senior IT Administrator
**RBAC Role:** ADMIN
**Experience Level:** 10+ years in IT infrastructure, familiar with API management and cloud services

### Goals

- Ensure all AI provider connectors are healthy, properly configured, and cost-efficient
- Monitor platform usage across the organization to control costs and enforce policies
- Configure intelligent routing policies that balance cost, latency, and privacy requirements
- Manage user accounts and enforce role-based access control
- Maintain system health and quickly identify service degradation

### Pain Points

- Cloud AI provider keys are sensitive; any leak could result in significant financial exposure
- Lack of visibility into which models and providers consume the most budget
- Difficulty enforcing data-privacy policies when users manually select cloud providers for sensitive queries
- Disparate dashboards across providers make consolidated monitoring time-consuming
- Managing multiple Ollama models and their role assignments requires specialized knowledge

### Key Workflows

1. **Connector Management:** Navigate to Connectors page, add a new provider (OpenAI, Anthropic, Gemini, DeepSeek), enter encrypted API key, test the connection, sync available models. Periodically re-test and re-sync to pick up new models.
2. **Routing Policy Configuration:** Go to Routing page, create policies (e.g., "Route all coding tasks to Anthropic," "Use LOCAL_ONLY for anything mentioning internal projects"), set priorities, and monitor decision history to validate behavior.
3. **Usage Monitoring:** Check the Audits page for event logs and the Usage section for cost and latency summaries. Export or filter by date range, provider, or model to prepare monthly reports.
4. **User Management:** Open Admin page, create or deactivate user accounts, assign roles (ADMIN/OPERATOR/VIEWER), and force password resets when needed.
5. **Health Monitoring:** Use the Observability dashboard to see aggregated health across all 11 backend services, Ollama runtime, and external connectors. Investigate server logs when services degrade.

### Feature Usage

| Feature                        | Frequency | Notes                                  |
| ------------------------------ | --------- | -------------------------------------- |
| Connectors (CRUD, test, sync)  | Weekly    | Add/update providers, verify health    |
| Routing policies               | Monthly   | Create/adjust, review decision history |
| Audit logs                     | Daily     | Spot anomalies, compliance checks      |
| Usage dashboard (cost/latency) | Weekly    | Budget tracking, optimization          |
| User management                | As needed | Onboarding, offboarding, role changes  |
| Health dashboard               | Daily     | Quick glance at system status          |
| Server logs                    | As needed | Troubleshooting incidents              |
| Settings (system)              | Rarely    | Initial setup, environment tuning      |

---

## 2. Developer

**Name:** Lina, Full-Stack Software Engineer
**RBAC Role:** OPERATOR
**Experience Level:** 5 years in software development, comfortable with CLI and API tools

### Goals

- Get fast, accurate answers to coding questions, debugging problems, and architecture decisions
- Use the best-suited AI model for each task (Claude for code review, GPT for creative solutions, local models for quick lookups)
- Attach code files and context packs to threads so the AI understands the full project context
- Iterate on responses through regeneration and feedback to refine answers
- Keep a searchable history of all conversations for future reference

### Pain Points

- Switching between ChatGPT, Claude, and Gemini web UIs wastes time and context
- Cannot attach repository files or maintain persistent memory of project decisions across sessions
- Generic AI responses that ignore established project conventions and architecture
- Losing conversation history when switching between different AI providers
- High latency when waiting for complex reasoning tasks to complete

### Key Workflows

1. **Daily Chat:** Open ClawAI, select or create a thread, optionally pick a routing mode (AUTO for intelligent routing, or MANUAL_MODEL to force a specific provider/model). Type a question, wait for the response, optionally regenerate or provide feedback.
2. **Code Review with Context:** Upload relevant source files via the Files page. Create a context pack containing project conventions and architecture decisions. Open a new chat thread, attach files and the context pack, set a system prompt like "You are a senior code reviewer following our project standards," and paste the code for review.
3. **Debugging Session:** Start a new thread with routing mode AUTO. Describe the bug with stack traces. The system routes to Claude Sonnet 4 for coding tasks. Iterate with follow-up messages as the AI requests more context. Attach log files if needed.
4. **Architecture Discussion:** Use HIGH_REASONING mode to route to Claude Opus 4. Ask about system design trade-offs. The memory service automatically extracts architectural decisions as FACT/INSTRUCTION memories for future conversations.
5. **Quick Reference:** Use LOCAL_ONLY mode for simple lookups (API syntax, language features) to avoid cloud API costs and latency.

### Feature Usage

| Feature                       | Frequency            | Notes                               |
| ----------------------------- | -------------------- | ----------------------------------- |
| Chat (threads, messages)      | Multiple times/day   | Primary workflow                    |
| Model selection (AUTO/MANUAL) | Every conversation   | Picks the right tool for the job    |
| File attachments              | Several times/week   | Code files, logs, configs           |
| Context packs                 | Weekly               | Project conventions, standards      |
| Memory (auto-extracted)       | Passive/daily review | Reviews and toggles extracted facts |
| Regenerate/feedback           | Frequently           | Refines AI responses                |
| System prompts                | Per thread           | Sets AI persona and constraints     |
| Image generation              | Occasionally         | Architecture diagrams, mockups      |
| File generation               | Occasionally         | Generates boilerplate, configs      |

---

## 3. Data Analyst

**Name:** Omar, Business Intelligence Analyst
**RBAC Role:** OPERATOR
**Experience Level:** 6 years in data analytics, proficient in SQL and Python, moderate technical depth

### Goals

- Upload CSV, JSON, and text data files and ask the AI to analyze, summarize, and identify trends
- Get help writing SQL queries, Python scripts, and data transformation logic
- Generate reports and formatted documents from analysis results
- Use the most capable model for data-heavy tasks (Gemini for file/data analysis, DeepSeek for math)
- Maintain a library of context packs with domain knowledge (business metrics definitions, data dictionaries)

### Pain Points

- Uploading large datasets to generic AI tools often fails or truncates data
- AI tools lose context between messages, requiring repetitive re-explanation of data schemas
- No ability to persist domain-specific knowledge (metric definitions, business rules) across conversations
- Difficulty comparing outputs from different AI providers to find the best analysis approach
- Generated code and queries often need significant manual correction due to lack of project context

### Key Workflows

1. **Data Analysis:** Upload a CSV file through the Files page. Wait for ingestion and chunking to complete. Create a new thread, attach the file, and ask questions like "Summarize the key trends in this dataset" or "Find outliers in the revenue column."
2. **Report Generation:** After an analysis conversation, use file generation to create a formatted report document. Specify the format (Markdown, text) and let the AI compile findings into a structured report.
3. **Query Writing:** Open a thread with a context pack containing the data dictionary and schema documentation. Ask the AI to write SQL queries, explaining the desired output. Iterate on the generated queries with feedback.
4. **Mathematical Analysis:** Use routing mode AUTO, which routes math and algorithm questions to DeepSeek or the local phi3:mini model. Ask for statistical analysis, formula derivation, or algorithm optimization.
5. **Context Pack Curation:** Build context packs with business definitions, KPI formulas, and data source descriptions. Attach these to analysis threads so the AI provides answers grounded in the organization's terminology.

### Feature Usage

| Feature                  | Frequency          | Notes                              |
| ------------------------ | ------------------ | ---------------------------------- |
| File upload and analysis | Several times/week | CSV, JSON, text files              |
| Chat (threads, messages) | Daily              | Analysis conversations             |
| Context packs            | Weekly             | Domain knowledge libraries         |
| File generation          | Weekly             | Reports, documentation             |
| Memory (auto-extracted)  | Passive            | Domain facts accumulate over time  |
| Model selection          | Per thread         | Gemini for data, DeepSeek for math |
| System prompts           | Per thread         | "You are a data analyst..."        |
| Feedback                 | Frequently         | Refines analysis quality           |

---

## 4. Privacy-Conscious User

**Name:** Nadia, Legal Compliance Officer
**RBAC Role:** OPERATOR
**Experience Level:** 8 years in legal and compliance, limited technical background

### Goals

- Use AI assistance for document review, policy drafting, and compliance analysis without sending sensitive data to cloud providers
- Ensure all conversations containing confidential information stay on local infrastructure
- Have clear visibility into which provider and model processed each message
- Maintain an audit trail proving that sensitive queries were handled locally
- Use the platform for both sensitive (local-only) and non-sensitive (cloud) tasks in the same interface

### Pain Points

- Constant worry that confidential legal documents and client information could be sent to third-party AI providers
- No transparency in most AI tools about where data is processed and stored
- Having to maintain separate tools for sensitive and non-sensitive work
- Difficulty proving compliance with data-handling policies during audits
- Local models are less capable than cloud models, leading to frustration when forced to use them for complex tasks

### Key Workflows

1. **Confidential Document Review:** Set routing mode to LOCAL_ONLY before starting a thread. Upload a confidential document (redacted if necessary). Ask the local model (gemma3:4b) to summarize, identify risks, or extract key clauses. Verify in the routing transparency badge that the response came from local-ollama.
2. **Privacy-First Routing:** For moderately sensitive work, use PRIVACY_FIRST mode. The system uses local models when healthy, falling back to Anthropic (which has stronger privacy terms) only if local is unavailable. Check the routing decision details to confirm the privacy classification.
3. **Compliance Audit Preparation:** Review the Audit Logs page filtered by their user ID. Export logs showing which provider handled each query. Use the routing decision history to prove that confidential threads used LOCAL_ONLY routing.
4. **Non-Sensitive Research:** Switch to AUTO mode for general legal research, case law lookups, and non-confidential policy comparisons. Benefit from faster, more capable cloud models when privacy is not a concern.
5. **Memory Management:** Regularly review auto-extracted memories to ensure no sensitive information has been stored as a persistent memory record. Toggle off or delete memories that contain confidential details.

### Feature Usage

| Feature                         | Frequency          | Notes                            |
| ------------------------------- | ------------------ | -------------------------------- |
| LOCAL_ONLY routing mode         | Daily              | All confidential work            |
| PRIVACY_FIRST routing mode      | Frequently         | Moderately sensitive work        |
| Routing transparency            | Every message      | Verifies provider used           |
| Audit logs (self-review)        | Weekly             | Compliance evidence              |
| Memory management               | Weekly             | Review/delete sensitive memories |
| File upload                     | Several times/week | Confidential documents           |
| Chat (threads, messages)        | Daily              | Primary workflow                 |
| Settings (language, appearance) | Rarely             | Initial setup                    |

---

## 5. Team Lead

**Name:** Karim, Engineering Team Lead
**RBAC Role:** ADMIN
**Experience Level:** 12 years in software engineering, 4 years managing a team of 8 developers

### Goals

- Understand how the team is using AI tools to identify training opportunities and best practices
- Monitor costs across the team to stay within the AI tools budget
- Ensure team members have appropriate access levels and are using the platform effectively
- Review audit logs for compliance reporting and identify misuse or policy violations
- Share useful context packs and routing configurations that benefit the entire team

### Pain Points

- No centralized view of team-wide AI usage patterns, making it hard to justify the budget
- Cannot identify which team members are underutilizing the platform or using it inefficiently
- Difficulty tracking the ROI of AI-assisted development across the team
- No easy way to share proven prompts, context packs, and routing configurations
- Balancing individual freedom in model choice with organizational cost constraints

### Key Workflows

1. **Usage Review:** Open the Usage dashboard. Filter by date range to see monthly summaries. Review cost breakdowns by provider and model. Identify the most expensive operations and the most active users. Compare latency across providers to optimize routing policies.
2. **Team Management:** In the Admin page, review user list. Create accounts for new team members with OPERATOR role. Deactivate accounts for departing members. Promote a senior developer to ADMIN for backup coverage.
3. **Audit Review:** Filter audit logs by action type (message.completed, routing.decision_made) to understand usage patterns. Look for anomalies such as excessive regenerations (indicating poor prompt quality) or repeated fallbacks (indicating connector issues).
4. **Routing Optimization:** Review routing decision history for the team's most common query types. Adjust policy priorities to route coding questions to the fastest/best provider. Create a COST_SAVER policy for non-critical queries to reduce spending.
5. **Health Monitoring:** Check the Observability dashboard daily. Investigate any service degradation that could impact the team's productivity. Review server logs for recurring errors.

### Feature Usage

| Feature                        | Frequency | Notes                                |
| ------------------------------ | --------- | ------------------------------------ |
| Usage dashboard (cost/latency) | Weekly    | Budget and efficiency tracking       |
| Audit logs                     | Weekly    | Compliance and pattern analysis      |
| User management                | As needed | Onboarding, offboarding              |
| Routing policies               | Monthly   | Optimize for team patterns           |
| Health dashboard               | Daily     | Ensure platform availability         |
| Chat (personal use)            | Daily     | Uses the platform alongside the team |
| Server/client logs             | As needed | Incident investigation               |
| Connectors                     | Monthly   | Verify provider health               |

---

## Persona-to-Role Mapping Summary

| Persona                | Primary Role | Can Use Chat | Can Manage Connectors | Can Manage Users | Can View Audits | Can Configure Routing |
| ---------------------- | ------------ | ------------ | --------------------- | ---------------- | --------------- | --------------------- |
| IT Administrator       | ADMIN        | Yes          | Yes                   | Yes              | Yes             | Yes                   |
| Developer              | OPERATOR     | Yes          | No                    | No               | No (own only)   | No                    |
| Data Analyst           | OPERATOR     | Yes          | No                    | No               | No (own only)   | No                    |
| Privacy-Conscious User | OPERATOR     | Yes          | No                    | No               | No (own only)   | No                    |
| Team Lead              | ADMIN        | Yes          | Yes                   | Yes              | Yes             | Yes                   |

---

## Persona-to-Feature Matrix

| Feature               | IT Admin | Developer | Data Analyst | Privacy User | Team Lead |
| --------------------- | -------- | --------- | ------------ | ------------ | --------- |
| Chat threads/messages | Low      | High      | High         | High         | Medium    |
| Model selection       | Low      | High      | Medium       | Medium       | Medium    |
| File upload/analysis  | Low      | Medium    | High         | Medium       | Low       |
| Context packs         | Low      | Medium    | High         | Low          | Low       |
| Memory management     | Low      | Low       | Medium       | High         | Low       |
| Image generation      | None     | Medium    | Low          | Low          | Low       |
| File generation       | None     | Low       | Medium       | Low          | Low       |
| Connectors            | High     | None      | None         | None         | Medium    |
| Routing policies      | High     | None      | None         | None         | Medium    |
| Audit logs            | High     | None      | None         | Medium       | High      |
| Usage dashboard       | High     | None      | None         | None         | High      |
| User management       | High     | None      | None         | None         | Medium    |
| Health/observability  | High     | None      | None         | None         | Medium    |
| Settings              | Medium   | Low       | Low          | Low          | Low       |
