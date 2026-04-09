# Product Vision

ClawAI is a local-first AI orchestration platform that gives organizations intelligent, transparent, and privacy-aware access to multiple AI providers through a single interface.

---

## Mission Statement

Democratize access to AI by providing a unified orchestration layer that automatically routes conversations to the best available model while keeping sensitive data local and costs under control.

---

## Problem Being Solved

Organizations today face a fragmented AI landscape:

1. **Provider lock-in.** Teams adopt one AI provider and miss the strengths of others. Claude is better at coding, Gemini is better at multimodal tasks, local models are better for privacy -- but switching between them is manual and slow.

2. **Privacy uncertainty.** Sensitive data gets sent to cloud APIs with no guardrails. Compliance teams cannot verify which data went where. There is no automated way to keep private data on local infrastructure.

3. **Cost opacity.** AI usage is distributed across providers with no central visibility. Teams overspend on expensive models for simple tasks that a smaller model could handle equally well.

4. **No institutional memory.** Every conversation starts from scratch. Context from previous interactions, user preferences, and organizational knowledge is lost between sessions.

5. **Operational blindness.** There is no audit trail, no usage analytics, and no way to enforce organizational policies on AI usage.

---

## Target Users

| User Type                   | Primary Need                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **IT Administrators**       | Control which AI providers are available, enforce policies, manage users and roles, audit AI usage across the organization |
| **Software Developers**     | Fast access to coding-optimized AI, file analysis, context-aware conversations that remember past decisions                |
| **Data Analysts**           | Upload datasets for AI-assisted analysis, generate reports, use multimodal models for charts and visualizations            |
| **Privacy-Conscious Teams** | Guarantee that sensitive conversations never leave local infrastructure, with verifiable routing transparency              |
| **Cost-Conscious Managers** | Route simple tasks to cheap or free local models, reserve expensive cloud models for complex work, track spending          |

---

## Value Proposition

### For the Organization

- **One platform, all providers.** Connect OpenAI, Anthropic, Google Gemini, DeepSeek, and local Ollama models. Add or remove providers without changing workflows.
- **Automatic intelligent routing.** The system analyzes each message and routes it to the best model for the task. Coding goes to Claude, image analysis goes to Gemini, simple Q&A stays local.
- **Privacy by architecture.** Sensitive conversations are automatically routed to local Ollama models. Data classification happens before routing, not after.
- **Full audit trail.** Every message, every routing decision, every model invocation is logged. Compliance teams get verifiable records.
- **Cost control.** Usage dashboards, per-provider spending, and routing policies that prefer cheaper models when appropriate.

### For the Individual User

- **It just works.** Type a message and get the best answer. No need to know which model to use.
- **Persistent memory.** The system extracts facts, preferences, and instructions from conversations and applies them to future interactions.
- **Context packs.** Attach curated knowledge (documentation, code samples, business rules) to any conversation.
- **File analysis.** Upload CSVs, JSON, Markdown, or text files and ask questions about them.
- **Transparency.** See exactly which model answered, why it was chosen, and how confident the routing decision was.

---

## Product Goals

### Goals

1. **Intelligent routing that improves over time.** The AUTO routing mode should select the right provider for the task at least 85% of the time, as measured by user feedback (thumbs up/down on messages).

2. **Sub-second routing decisions.** Routing should add no more than 1 second of overhead to any request. The Ollama router has a 10-second timeout with heuristic fallback to ensure this.

3. **Zero-configuration privacy.** Privacy-sensitive content should be automatically detected and routed locally without requiring the user to select a routing mode manually.

4. **Organizational memory.** After 30 days of use, the memory system should surface relevant context in at least 50% of conversations where it is applicable.

5. **Full operational visibility.** Every AI interaction must produce an audit record. Usage dashboards must show cost, latency, and provider distribution in real time.

6. **Self-hosted and portable.** The entire platform runs on a single machine with Docker Compose. No cloud dependencies required (Ollama provides local AI capability).

7. **Multi-language accessibility.** The interface must be fully localized in 8 languages with RTL support for Arabic.

### Non-Goals

1. **Training or fine-tuning models.** ClawAI orchestrates existing models; it does not train new ones.

2. **Replacing provider-specific features.** ClawAI provides a unified chat interface, not a full replacement for each provider's native UI (no Artifacts, no Canvas, no Playground).

3. **Multi-tenant SaaS.** ClawAI is designed for single-organization deployment. Multi-tenancy is not a current objective.

4. **Real-time collaboration.** Conversations are single-user. Shared threads or collaborative editing are not in scope.

5. **Agentic tool use.** ClawAI routes messages to AI providers and returns responses. It does not execute code, browse the web, or take actions on behalf of the user (beyond image and file generation).

---

## Success Metrics / KPIs

| Metric                    | Target                                               | How Measured                              |
| ------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| **Routing accuracy**      | >= 85% positive feedback on AUTO-routed messages     | `ChatMessage.feedback` field aggregation  |
| **Routing latency**       | < 1 second for 95th percentile                       | `RoutingDecision` timestamps              |
| **System availability**   | 99.5% uptime during business hours                   | Health service aggregation                |
| **Memory relevance**      | >= 50% of surfaced memories rated useful             | User feedback on memory suggestions       |
| **Cost reduction**        | >= 30% reduction vs. using a single premium provider | Usage ledger comparison (local vs. cloud) |
| **Onboarding time**       | New engineer productive in < 1 day                   | Time from clone to first merged PR        |
| **Audit completeness**    | 100% of AI interactions have audit records           | Audit log count vs. message count         |
| **Localization coverage** | 100% of user-facing text in all 8 languages          | i18n key coverage report                  |

---

## Competitive Positioning

### What Makes ClawAI Different

| Dimension          | Typical AI Chat App        | ClawAI                                                               |
| ------------------ | -------------------------- | -------------------------------------------------------------------- |
| **Providers**      | Single provider            | 5 providers + local Ollama                                           |
| **Routing**        | Manual model selection     | 7 automated routing modes                                            |
| **Privacy**        | All data goes to cloud     | Local-first with automatic privacy routing                           |
| **Memory**         | Per-conversation only      | Cross-conversation extraction (facts, preferences, instructions)     |
| **Deployment**     | Cloud-hosted SaaS          | Self-hosted, single Docker Compose                                   |
| **Audit**          | Minimal or none            | Full audit trail with usage analytics                                |
| **Access control** | Single user or basic teams | RBAC with 3 roles (Admin, Operator, Viewer)                          |
| **Localization**   | English only or limited    | 8 languages including RTL Arabic                                     |
| **Transparency**   | Black box                  | Routing confidence, reason tags, cost/privacy class on every message |

### Strategic Position

ClawAI occupies the intersection of three trends:

1. **Multi-model AI** -- no single provider is best at everything, so orchestration creates value.
2. **Data sovereignty** -- organizations increasingly require that sensitive data stays on their infrastructure.
3. **AI cost management** -- as AI usage scales, routing simple tasks to cheaper models produces significant savings.

The platform is designed for organizations that need AI access but cannot or will not send all data to a single cloud provider.
