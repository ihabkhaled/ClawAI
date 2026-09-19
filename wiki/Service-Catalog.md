# Service Catalog

| Service | Port | Database | Endpoints | Tests | Modules |
| --- | --- | --- | --- | --- | --- |
| [[claw-agent-service\|Service-claw-agent-service]] | 4015 | postgresql | 87 | 13 | activity-memory, agent, fleet, health, marketplace, recipes |
| [[claw-audit-service\|Service-claw-audit-service]] | 4007 | mongodb | 15 | 21 | audits, feedback, health |
| [[claw-auth-service\|Service-claw-auth-service]] | 4001 | postgresql | 99 | 96 | admin-statistics, auth, credit, deployment, entitlements, health, plans, quota, roles, system-settings, users |
| [[claw-chat-service\|Service-claw-chat-service]] | 4002 | postgresql | 49 | 151 | chat-messages, chat-shares, chat-threads, coding-agent-chats, context-preview, context-receipts, health |
| [[claw-client-logs-service\|Service-claw-client-logs-service]] | env-only | mongodb | 6 | 6 | client-logs, health |
| [[claw-connector-service\|Service-claw-connector-service]] | 4003 | postgresql | 19 | 25 | connectors, health |
| [[claw-file-generation-service\|Service-claw-file-generation-service]] | 4013 | postgresql | 7 | 7 | file-generation, health |
| [[claw-file-service\|Service-claw-file-service]] | 4006 | postgresql | 17 | 20 | files, health |
| [[claw-health-service\|Service-claw-health-service]] | 4009 | none | 1 | 4 | health |
| [[claw-image-service\|Service-claw-image-service]] | 4012 | postgresql | 9 | 12 | health, image-generation, runtime-progress |
| [[claw-llamacpp-service\|Service-claw-llamacpp-service]] | 4017 | postgresql | 26 | 17 | binary, catalog, hardware, health, inference, models-lifecycle, pull-jobs, runtime-progress |
| [[claw-memory-service\|Service-claw-memory-service]] | 4005 | postgresql | 46 | 14 | context-pack-portable, context-pack-templates, context-pack-versions, context-packs, embeddings, health, memory, memory-audit, memory-portable, memory-preferences, memory-suggestions, memory-usage |
| [[claw-ollama-service\|Service-claw-ollama-service]] | 4008 | postgresql | 35 | 18 | health, ollama, runtime-progress |
| [[claw-payment-service\|Service-claw-payment-service]] | 4018 | postgresql | 39 | 110 | admin-user-billing, billing, billing-dashboard, checkout, display-fx, fx, gateway-config, gateways, health, idempotency, internal-payments, invoice-documents, outbox, plan-catalog, reconciliation, refunds, scheduled-jobs, subscriptions, webhooks |
| [[claw-research-service\|Service-claw-research-service]] | 4016 | postgresql | 17 | 31 | fetch, health, research, scrape, search |
| [[claw-routing-service\|Service-claw-routing-service]] | 4004 | postgresql | 74 | 99 | assistant-models, classifier, health, intelligence, language-detection, learning-loop, modality-detection, observability, playground, reliability, route-evaluator, router-configuration-admin, router-models, routing, scoring, sync, taxonomy, workflows |
| [[claw-server-logs-service\|Service-claw-server-logs-service]] | env-only | mongodb | 7 | 7 | health, server-logs |
| [[claw-workspace-service\|Service-claw-workspace-service]] | 4014 | postgresql | 108 | 96 | actions, ai-actions, auto-suggest, chains, connector-access, digest, email-signatures, email-templates, health, inbox, learning, suggestion-factory, ticket-planning, webhooks, workspace, workspace-events |

There are **18 current backend services**. Each service page includes generated endpoints, persistence ownership, module layout and its full tracked-file inventory.
