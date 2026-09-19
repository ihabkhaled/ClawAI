# Nginx Routing

Current generated route count: **59**.

| Location | Service | Port | Source |
| --- | --- | --- | --- |
| `/` | claw-frontend | 3000 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/admin` | auth-service | 4001 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/admin/billing` | payment-service | 4018 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/admin/payment-gateways` | payment-service | 4018 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/agent` | agent-service | 4015 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/audits` | audit-service | 4007 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/auth` | auth-service | 4001 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/billing` | payment-service | 4018 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/billing/display-currency` | payment-service | 4018 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/best-of-n` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/consensus` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/cost-ensemble` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/decompose` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/escalation-chain` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/parallel` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/pipeline` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/role-pack` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/runtime` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/stream` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-messages/verify` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/chat-threads` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/client-logs` | client-logs-service | 4010 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/coding-agent-chats` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/connectors` | connector-service | 4003 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/context` | memory-service | 4005 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/context-packs` | memory-service | 4005 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/credit` | auth-service | 4001 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/feedback` | audit-service | 4007 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/file-generations` | file-generation-service | 4013 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/file-generations/` | file-generation-service | 4013 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/files` | file-service | 4006 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/health` | health-service | 4009 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/images` | image-service | 4012 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/images/` | image-service | 4012 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/internal/chat-shares` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/llamacpp/` | llamacpp-service | 4017 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/llamacpp/v1/` | llamacpp-service | 4017 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/memories` | memory-service | 4005 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/memory` | memory-service | 4005 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/messages` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/models` | connector-service | 4003 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/ollama` | ollama-service | 4008 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/payments` | payment-service | 4018 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/payments/webhooks` | payment-service | 4018 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/public/chat-shares` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/research` | research-service | 4016 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/router-models` | routing-service | 4004 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/routing` | routing-service | 4004 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/routing/adaptive-insights` | routing-service | 4004 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/server-logs` | server-logs-service | 4011 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/threads` | chat-service | 4002 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/usage` | audit-service | 4007 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/users` | auth-service | 4001 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/workspace` | workspace-service | 4014 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `/api/v1/workspace/ai-actions/run` | workspace-service | 4014 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `~` | ollama-service | 4008 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `~` | agent-service | 4015 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |
| `~` | llamacpp-service | 4017 | [infra/nginx/locations.conf](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx/locations.conf) |

Nginx configuration lives under [infra/nginx/](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx).
