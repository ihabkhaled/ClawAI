# RabbitMQ Events

Exchange: `claw.events`  
Patterns: **178**

> Producer/consumer attribution in `event-graph.json` is generated heuristically. Verify call paths before a critical change.

| Key | Pattern | Producers | Consumers |
| --- | --- | --- | --- |
| `AGENT_CAPABILITY_APPROVED` | `agent.capability.approved` | claw-agent-service | claw-audit-service |
| `AGENT_CAPABILITY_AUTO_APPROVED` | `agent.capability.auto_approved` | claw-agent-service | claw-audit-service |
| `AGENT_CAPABILITY_CANCELLED` | `agent.capability.cancelled` | claw-agent-service | claw-audit-service |
| `AGENT_CAPABILITY_DENIED` | `agent.capability.denied` | claw-agent-service | claw-audit-service |
| `AGENT_CAPABILITY_EXECUTED` | `agent.capability.executed` | claw-agent-service | claw-audit-service |
| `AGENT_CAPABILITY_EXECUTING` | `agent.capability.executing` | — | claw-agent-service, claw-audit-service |
| `AGENT_CAPABILITY_EXPIRED` | `agent.capability.expired` | claw-agent-service | claw-audit-service |
| `AGENT_CAPABILITY_FAILED` | `agent.capability.failed` | claw-agent-service | claw-audit-service |
| `AGENT_CAPABILITY_POLICY_MATCHED` | `agent.capability.policy_matched` | claw-agent-service | claw-audit-service |
| `AGENT_CAPABILITY_PROPOSED` | `agent.capability.proposed` | claw-agent-service | claw-audit-service |
| `AGENT_CAPABILITY_REJECTED` | `agent.capability.rejected` | claw-agent-service | claw-audit-service |
| `AGENT_CAPABILITY_ROLLED_BACK` | `agent.capability.rolled_back` | claw-agent-service | claw-audit-service |
| `AGENT_COMMAND_APPROVED` | `agent.command_approved` | claw-agent-service | — |
| `AGENT_COMMAND_CANCELLED` | `agent.command_cancelled` | claw-agent-service | — |
| `AGENT_COMMAND_COMPLETED` | `agent.command_completed` | claw-agent-service | — |
| `AGENT_COMMAND_REJECTED` | `agent.command_rejected` | claw-agent-service | — |
| `AGENT_COMMAND_REQUESTED` | `agent.command_requested` | claw-agent-service | — |
| `AGENT_COMMAND_STREAMED` | `agent.command_streamed` | — | — |
| `AGENT_DEVICE_PAIRED` | `agent.device_paired` | claw-agent-service | claw-audit-service |
| `AGENT_DEVICE_REVOKED` | `agent.device_revoked` | claw-agent-service | claw-audit-service |
| `AGENT_POLICY_VIOLATED` | `agent.policy_violated` | claw-agent-service | claw-audit-service |
| `AGENT_SESSION_CONNECTED` | `agent.session_connected` | claw-agent-service | claw-audit-service |
| `AGENT_SESSION_DISCONNECTED` | `agent.session_disconnected` | claw-agent-service | claw-audit-service |
| `AGENT_TOKEN_REUSE_DETECTED` | `agent.token_reuse_detected` | claw-agent-service | claw-audit-service |
| `AGENT_TOKEN_ROTATED` | `agent.token_rotated` | claw-agent-service | claw-audit-service |
| `AI_ACTION_APPROVED` | `ai_action.approved` | claw-workspace-service | claw-audit-service |
| `AI_ACTION_AUTO_APPROVED` | `ai_action.auto_approved` | claw-workspace-service | claw-audit-service |
| `AI_ACTION_DENIED` | `ai_action.denied` | claw-workspace-service | claw-audit-service |
| `AI_ACTION_EDITED` | `ai_action.edited` | claw-workspace-service | claw-audit-service |
| `AI_ACTION_EXECUTED` | `ai_action.executed` | — | claw-audit-service |
| `AI_ACTION_EXPIRED` | `ai_action.expired` | claw-workspace-service | claw-audit-service |
| `AI_ACTION_PENDING_APPROVAL` | `ai_action.pending_approval` | claw-workspace-service | claw-audit-service |
| `AI_ACTION_POLICY_CREATED` | `ai_action.policy.created` | claw-workspace-service | claw-audit-service |
| `AI_ACTION_POLICY_DELETED` | `ai_action.policy.deleted` | claw-workspace-service | claw-audit-service |
| `AI_ACTION_POLICY_UPDATED` | `ai_action.policy.updated` | claw-workspace-service | claw-audit-service |
| `AI_ACTION_REJECTED` | `ai_action.rejected` | claw-workspace-service | claw-audit-service |
| `AI_ACTION_SUGGESTION_CREATED` | `ai_action.suggestion_created` | claw-workspace-service | claw-audit-service |
| `AUDIT_EVENT` | `audit.event` | — | — |
| `BILLING_CREDIT_TOPUP_REVERSED` | `billing.credit.topup_reversed` | — | claw-audit-service, claw-auth-service, claw-payment-service |
| `BILLING_CREDIT_TOPUP_SUCCEEDED` | `billing.credit.topup_succeeded` | — | claw-audit-service, claw-auth-service, claw-payment-service |
| `BILLING_ENTITLEMENT_RECONCILE_REQUESTED` | `billing.entitlement.reconcile_requested` | — | claw-audit-service, claw-auth-service |
| `BILLING_PAYMENT_CHARGEBACK` | `billing.payment.chargeback` | — | claw-audit-service, claw-auth-service, claw-payment-service |
| `BILLING_PAYMENT_REFUNDED` | `billing.payment.refunded` | — | claw-audit-service, claw-auth-service, claw-payment-service |
| `BILLING_SUBSCRIPTION_ACTIVATED` | `billing.subscription.activated` | — | claw-audit-service, claw-auth-service, claw-payment-service |
| `BILLING_SUBSCRIPTION_CANCELLED` | `billing.subscription.cancelled` | — | claw-audit-service, claw-auth-service, claw-payment-service |
| `BILLING_SUBSCRIPTION_DOWNGRADE_SCHEDULED` | `billing.subscription.downgrade_scheduled` | — | claw-audit-service, claw-payment-service |
| `BILLING_SUBSCRIPTION_DOWNGRADED` | `billing.subscription.downgraded` | — | claw-audit-service, claw-auth-service, claw-payment-service |
| `BILLING_SUBSCRIPTION_EXPIRED` | `billing.subscription.expired` | — | claw-audit-service, claw-auth-service, claw-payment-service |
| `BILLING_SUBSCRIPTION_PAST_DUE` | `billing.subscription.past_due` | — | claw-audit-service, claw-payment-service |
| `BILLING_SUBSCRIPTION_RENEWED` | `billing.subscription.renewed` | — | claw-audit-service, claw-auth-service |
| `BILLING_SUBSCRIPTION_SUSPENDED` | `billing.subscription.suspended` | — | claw-audit-service, claw-auth-service, claw-payment-service |
| `BILLING_SUBSCRIPTION_UPGRADED` | `billing.subscription.upgraded` | — | claw-audit-service, claw-auth-service, claw-payment-service |
| `CATALOG_UPDATED` | `catalog.updated` | — | — |
| `CHAT_SHARE_PUBLISHED` | `chat.share.published` | — | claw-audit-service, claw-chat-service |
| `CHAT_SHARE_REVOKED` | `chat.share.revoked` | — | claw-audit-service, claw-chat-service |
| `CHAT_SHARE_SAFETY_REJECTED` | `chat.share.safety_rejected` | — | claw-audit-service, claw-chat-service |
| `CHAT_SHARE_UPDATED` | `chat.share.updated` | — | claw-audit-service, claw-chat-service |
| `CHAT_SHARE_URL_REGENERATED` | `chat.share.url_regenerated` | — | claw-audit-service, claw-chat-service |
| `CHAT_SHARE_VISIBILITY_CHANGED` | `chat.share.visibility_changed` | — | claw-audit-service, claw-chat-service |
| `CHAT_THREAD_CONTEXT_TOGGLED` | `chat_thread.context_toggled` | claw-chat-service | — |
| `CHAT_THREAD_MEMORY_TOGGLED` | `chat_thread.memory_toggled` | claw-chat-service | — |
| `CONNECTOR_CREATED` | `connector.created` | claw-connector-service | claw-audit-service |
| `CONNECTOR_DELETED` | `connector.deleted` | claw-connector-service | claw-audit-service |
| `CONNECTOR_HEALTH_CHECKED` | `connector.health_checked` | claw-connector-service | claw-audit-service, claw-routing-service |
| `CONNECTOR_MODEL_EXPOSURE_CHANGED` | `connector.model_exposure_changed` | claw-connector-service | claw-chat-service |
| `CONNECTOR_SYNCED` | `connector.synced` | claw-connector-service, claw-ollama-service | claw-audit-service, claw-routing-service |
| `CONNECTOR_UPDATED` | `connector.updated` | claw-connector-service, claw-ollama-service | claw-audit-service |
| `CONTEXT_RECEIPT_WRITTEN` | `context.receipt_written` | claw-chat-service | — |
| `CONTEXT_PACK_ATTACHED` | `context_pack.attached` | — | — |
| `CONTEXT_PACK_CREATED` | `context_pack.created` | — | — |
| `CONTEXT_PACK_DELETED` | `context_pack.deleted` | — | — |
| `CONTEXT_PACK_DETACHED` | `context_pack.detached` | — | — |
| `CONTEXT_PACK_SHARED` | `context_pack.shared` | — | — |
| `CONTEXT_PACK_UPDATED` | `context_pack.updated` | — | — |
| `CONTEXT_PACK_USED` | `context_pack.used` | — | — |
| `CONTEXT_PACK_VERSION_CREATED` | `context_pack.version_created` | claw-memory-service | — |
| `CONTEXT_PACK_VERSION_REVERTED` | `context_pack.version_reverted` | claw-memory-service | — |
| `CREDIT_BALANCE_EXHAUSTED` | `credit.balance.exhausted` | claw-auth-service | — |
| `CREDIT_BALANCE_LOW` | `credit.balance.low` | claw-auth-service | — |
| `CREDIT_GRANT_RENEWED` | `credit.grant.renewed` | claw-auth-service | — |
| `FILE_ARCHIVE_EXPANDED` | `file.archive_expanded` | claw-file-service | claw-audit-service |
| `FILE_CHUNKED` | `file.chunked` | claw-file-service | claw-audit-service |
| `FILE_DELETED` | `file.deleted` | claw-file-service | claw-audit-service |
| `FILE_DOWNLOADED` | `file.downloaded` | claw-file-service | claw-audit-service |
| `FILE_EXTRACTION_FAILED` | `file.extraction_failed` | claw-file-service | claw-audit-service |
| `FILE_FAILED` | `file.failed` | claw-file-service | claw-audit-service |
| `FILE_GENERATED` | `file.generated` | — | — |
| `FILE_OCR_COMPLETED` | `file.ocr_completed` | claw-file-service | claw-audit-service |
| `FILE_OCR_FAILED` | `file.ocr_failed` | claw-file-service | claw-audit-service |
| `FILE_OCR_STARTED` | `file.ocr_started` | claw-file-service | claw-audit-service |
| `FILE_RETENTION_EXPIRED` | `file.retention_expired` | claw-file-service | claw-audit-service |
| `FILE_UPLOAD_COMPLETED` | `file.upload_completed` | claw-file-service | claw-audit-service |
| `FILE_UPLOAD_STARTED` | `file.upload_started` | claw-file-service | claw-audit-service |
| `FILE_UPLOADED` | `file.uploaded` | claw-file-service | claw-audit-service |
| `FILE_GENERATION_FAILED` | `file_generation.failed` | — | — |
| `HEALTH_CHECK` | `health.check` | — | — |
| `IMAGE_FAILED` | `image.failed` | — | — |
| `IMAGE_GENERATED` | `image.generated` | — | — |
| `LLAMACPP_BINARY_INSTALLED` | `llamacpp.binary.installed` | claw-llamacpp-service | claw-audit-service |
| `LLAMACPP_BINARY_UPDATED` | `llamacpp.binary.updated` | claw-llamacpp-service | claw-audit-service |
| `LLAMACPP_MODEL_CRASHED` | `llamacpp.model.crashed` | claw-llamacpp-service | claw-audit-service, claw-routing-service |
| `LLAMACPP_MODEL_LOADED` | `llamacpp.model.loaded` | claw-llamacpp-service | claw-audit-service, claw-routing-service |
| `LLAMACPP_MODEL_UNLOADED` | `llamacpp.model.unloaded` | claw-llamacpp-service | claw-audit-service, claw-routing-service |
| `LLAMACPP_PREFLIGHT_OVERRIDDEN` | `llamacpp.preflight.overridden` | claw-llamacpp-service | claw-audit-service |
| `LLAMACPP_PULL_COMPLETED` | `llamacpp.pull.completed` | claw-llamacpp-service | claw-audit-service |
| `LLAMACPP_PULL_FAILED` | `llamacpp.pull.failed` | claw-llamacpp-service | claw-audit-service |
| `LLAMACPP_PULL_PROGRESS` | `llamacpp.pull.progress` | claw-llamacpp-service | claw-audit-service |
| `LLAMACPP_PULL_STARTED` | `llamacpp.pull.started` | claw-llamacpp-service | claw-audit-service |
| `LLAMACPP_WEIGHTS_DELETED` | `llamacpp.weights.deleted` | claw-llamacpp-service | claw-audit-service |
| `LOG_SERVER` | `log.server` | claw-agent-service, claw-audit-service, claw-auth-service, claw-chat-service, claw-client-logs-service, claw-connector-service, claw-file-generation-service, claw-file-service, claw-image-service, claw-llamacpp-service, claw-memory-service, claw-ollama-service, claw-payment-service, claw-research-service, claw-routing-service, claw-server-logs-service, claw-workspace-service | — |
| `MEMORY_APPROVED` | `memory.approved` | claw-memory-service | — |
| `MEMORY_EXTRACTED` | `memory.extracted` | claw-memory-service | claw-audit-service |
| `MEMORY_FORGOTTEN` | `memory.forgotten` | claw-memory-service | — |
| `MEMORY_PAUSED` | `memory.paused` | — | — |
| `MEMORY_PREFERENCE_UPSERTED` | `memory.preference.upserted` | claw-workspace-service | — |
| `MEMORY_REDACTED` | `memory.redacted` | claw-memory-service | — |
| `MEMORY_REJECTED` | `memory.rejected` | claw-memory-service | — |
| `MEMORY_SUGGESTED` | `memory.suggested` | claw-memory-service | — |
| `MEMORY_USED` | `memory.used` | — | — |
| `MESSAGE_COMPLETED` | `message.completed` | claw-chat-service | claw-audit-service, claw-memory-service, claw-routing-service |
| `MESSAGE_CREATED` | `message.created` | claw-chat-service | claw-routing-service |
| `MESSAGE_FEEDBACK_SET` | `message.feedback_set` | claw-chat-service | — |
| `MESSAGE_ROUTED` | `message.routed` | claw-routing-service | claw-chat-service |
| `MODEL_DELETED` | `model.deleted` | — | claw-routing-service |
| `MODEL_PULLED` | `model.pulled` | — | claw-routing-service |
| `ROUTER_TRACE_EMITTED` | `router.trace.emitted` | claw-routing-service | claw-chat-service |
| `ROUTING_CIRCUIT_BREAKER_CLOSED` | `routing.circuit_breaker.closed` | — | claw-audit-service, claw-routing-service |
| `ROUTING_CIRCUIT_BREAKER_HALF_OPEN` | `routing.circuit_breaker.half_open` | — | claw-audit-service |
| `ROUTING_CIRCUIT_BREAKER_OPENED` | `routing.circuit_breaker.opened` | — | claw-audit-service, claw-routing-service |
| `ROUTING_DECISION_MADE` | `routing.decision_made` | — | claw-audit-service |
| `ROUTING_LEARNED_SCORE_UPDATED` | `routing.learned_score.updated` | — | claw-audit-service, claw-routing-service |
| `ROUTING_MODEL_COST_PUBLISHED` | `routing.model_cost.published` | claw-routing-service | claw-auth-service |
| `ROUTING_MODELS_SYNCED` | `routing.models.synced` | claw-routing-service | claw-audit-service |
| `ROUTING_NO_EXECUTION_MODEL` | `routing.no_execution_model` | — | claw-audit-service |
| `ROUTING_POLICY_CHANGED` | `routing.policy.changed` | — | claw-audit-service |
| `ROUTING_PROFILE_CREATED` | `routing.profile.created` | — | claw-audit-service, claw-routing-service |
| `ROUTING_PROFILE_LIFECYCLE_CHANGED` | `routing.profile.lifecycle_changed` | — | claw-audit-service, claw-routing-service |
| `ROUTING_PROFILE_UPDATED` | `routing.profile.updated` | — | claw-audit-service, claw-routing-service |
| `USER_ACTIVATED` | `user.activated` | claw-auth-service | claw-audit-service |
| `USER_CREATED` | `user.created` | claw-auth-service | — |
| `USER_DEACTIVATED` | `user.deactivated` | claw-auth-service | — |
| `USER_LOGIN` | `user.login` | claw-auth-service | claw-audit-service |
| `USER_LOGOUT` | `user.logout` | claw-auth-service | claw-audit-service |
| `USER_REACTIVATED` | `user.reactivated` | claw-auth-service | — |
| `USER_ROLE_CHANGED` | `user.role_changed` | claw-auth-service | — |
| `USER_TEMPORARY_PASSWORD_ISSUED` | `user.temporary_password_issued` | claw-auth-service | claw-audit-service |
| `USER_UPDATED` | `user.updated` | claw-auth-service | — |
| `WORKSPACE_AUTO_SUGGEST_TICK_COMPLETED` | `workspace.auto_suggest.tick.completed` | claw-workspace-service | — |
| `WORKSPACE_AUTO_SUGGEST_TICK_FAILED` | `workspace.auto_suggest.tick.failed` | claw-workspace-service | — |
| `WORKSPACE_AUTO_SUGGEST_TICK_STARTED` | `workspace.auto_suggest.tick.started` | claw-workspace-service | — |
| `WORKSPACE_EVENT_INGESTED` | `workspace.event.ingested` | claw-workspace-service | — |
| `WORKSPACE_SUGGESTION_FACTORY_PROCESSED` | `workspace.suggestion.factory_processed` | claw-workspace-service | — |
| `WORKSPACE_SYNC_DLQ_SENT` | `workspace.sync.dlq_sent` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_SYNC_MANUAL_TRIGGERED` | `workspace.sync.manual_triggered` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_SYNC_PAUSED` | `workspace.sync.paused` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_SYNC_RATE_LIMITED` | `workspace.sync.rate_limited` | — | claw-audit-service |
| `WORKSPACE_SYNC_RESUMED` | `workspace.sync.resumed` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_SYNC_RUN_COMPLETED` | `workspace.sync.run_completed` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_SYNC_RUN_FAILED` | `workspace.sync.run_failed` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_SYNC_RUN_STARTED` | `workspace.sync.run_started` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_SYNC_STALE_DETECTED` | `workspace.sync.stale_detected` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_WEBHOOK_RECEIVED` | `workspace.webhook.received` | claw-workspace-service | — |
| `WORKSPACE_WEBHOOK_REJECTED` | `workspace.webhook.rejected` | claw-workspace-service | — |
| `WORKSPACE_WEBHOOK_REPLAYED` | `workspace.webhook.replayed` | claw-workspace-service | — |
| `WORKSPACE_ACTION_APPROVED` | `workspace_action.approved` | claw-workspace-service | — |
| `WORKSPACE_ACTION_BULK_APPROVED` | `workspace_action.bulk_approved` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_ACTION_DRAFTED` | `workspace_action.drafted` | claw-workspace-service | — |
| `WORKSPACE_ACTION_EDITED` | `workspace_action.edited` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_ACTION_EXECUTED` | `workspace_action.executed` | claw-workspace-service | — |
| `WORKSPACE_ACTION_FAILED` | `workspace_action.failed` | claw-workspace-service | — |
| `WORKSPACE_ACTION_REJECTED` | `workspace_action.rejected` | claw-workspace-service | — |
| `WORKSPACE_ACTION_STALE_BLOCKED` | `workspace_action.stale_blocked` | claw-workspace-service | claw-audit-service |
| `WORKSPACE_CONNECTOR_CREATED` | `workspace_connector.created` | claw-workspace-service | — |
| `WORKSPACE_CONNECTOR_DELETED` | `workspace_connector.deleted` | claw-workspace-service | — |
| `WORKSPACE_CONNECTOR_HEALTH_CHECKED` | `workspace_connector.health_checked` | — | — |
| `WORKSPACE_CONNECTOR_SYNCED` | `workspace_connector.synced` | — | — |
| `WORKSPACE_CONNECTOR_UPDATED` | `workspace_connector.updated` | claw-workspace-service | — |
| `WORKSPACE_OBJECT_SYNCED` | `workspace_object.synced` | claw-workspace-service | — |

Sources: [.ai/manifests/rabbitmq-events.json](https://github.com/ihabkhaled/ClawAI/blob/main/.ai/manifests/rabbitmq-events.json) · [.ai/manifests/event-graph.json](https://github.com/ihabkhaled/ClawAI/blob/main/.ai/manifests/event-graph.json).
