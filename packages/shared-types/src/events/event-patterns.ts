export enum EventPattern {
  USER_CREATED = 'user.created',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_ROLE_CHANGED = 'user.role_changed',
  USER_DEACTIVATED = 'user.deactivated',
  USER_UPDATED = 'user.updated',
  USER_REACTIVATED = 'user.reactivated',
  USER_ACTIVATED = 'user.activated',
  USER_TEMPORARY_PASSWORD_ISSUED = 'user.temporary_password_issued',
  MESSAGE_CREATED = 'message.created',
  MESSAGE_ROUTED = 'message.routed',
  MESSAGE_COMPLETED = 'message.completed',
  MESSAGE_FEEDBACK_SET = 'message.feedback_set',
  CONNECTOR_CREATED = 'connector.created',
  CONNECTOR_UPDATED = 'connector.updated',
  CONNECTOR_DELETED = 'connector.deleted',
  CONNECTOR_SYNCED = 'connector.synced',
  // Emitted when an administrator exposes or unexposes models on a connector.
  // Consumers cache exposure decisions to keep the check off the hot path; this
  // is what tells them to drop that cache, so an unexpose takes effect while the
  // administrator is still looking at the screen rather than up to a TTL later.
  CONNECTOR_MODEL_EXPOSURE_CHANGED = 'connector.model_exposure_changed',
  CONNECTOR_HEALTH_CHECKED = 'connector.health_checked',
  ROUTING_DECISION_MADE = 'routing.decision_made',
  /**
   * @deprecated Use FILE_UPLOAD_COMPLETED instead. Kept as a backward-compat
   * alias for two release cycles to avoid breaking existing publishers and
   * consumers during the Slice D file-lifecycle migration.
   */
  FILE_UPLOADED = 'file.uploaded',
  FILE_CHUNKED = 'file.chunked',
  FILE_FAILED = 'file.failed',
  FILE_RETENTION_EXPIRED = 'file.retention_expired',
  FILE_ARCHIVE_EXPANDED = 'file.archive_expanded',
  // === Slice D — File lifecycle + OCR events ===
  FILE_UPLOAD_STARTED = 'file.upload_started',
  FILE_UPLOAD_COMPLETED = 'file.upload_completed',
  FILE_EXTRACTION_FAILED = 'file.extraction_failed',
  FILE_DOWNLOADED = 'file.downloaded',
  FILE_DELETED = 'file.deleted',
  FILE_OCR_STARTED = 'file.ocr_started',
  FILE_OCR_COMPLETED = 'file.ocr_completed',
  FILE_OCR_FAILED = 'file.ocr_failed',
  MEMORY_EXTRACTED = 'memory.extracted',
  AUDIT_EVENT = 'audit.event',
  HEALTH_CHECK = 'health.check',
  LOG_SERVER = 'log.server',
  IMAGE_GENERATED = 'image.generated',
  IMAGE_FAILED = 'image.failed',
  FILE_GENERATED = 'file.generated',
  FILE_GENERATION_FAILED = 'file_generation.failed',
  MODEL_PULLED = 'model.pulled',
  MODEL_DELETED = 'model.deleted',
  CATALOG_UPDATED = 'catalog.updated',
  WORKSPACE_CONNECTOR_CREATED = 'workspace_connector.created',
  WORKSPACE_CONNECTOR_UPDATED = 'workspace_connector.updated',
  WORKSPACE_CONNECTOR_DELETED = 'workspace_connector.deleted',
  WORKSPACE_CONNECTOR_SYNCED = 'workspace_connector.synced',
  WORKSPACE_CONNECTOR_HEALTH_CHECKED = 'workspace_connector.health_checked',
  WORKSPACE_OBJECT_SYNCED = 'workspace_object.synced',
  WORKSPACE_SYNC_RUN_STARTED = 'workspace.sync.run_started',
  WORKSPACE_SYNC_RUN_COMPLETED = 'workspace.sync.run_completed',
  WORKSPACE_SYNC_RUN_FAILED = 'workspace.sync.run_failed',
  WORKSPACE_SYNC_STALE_DETECTED = 'workspace.sync.stale_detected',
  WORKSPACE_SYNC_MANUAL_TRIGGERED = 'workspace.sync.manual_triggered',
  WORKSPACE_SYNC_PAUSED = 'workspace.sync.paused',
  WORKSPACE_SYNC_RESUMED = 'workspace.sync.resumed',
  WORKSPACE_SYNC_RATE_LIMITED = 'workspace.sync.rate_limited',
  WORKSPACE_SYNC_DLQ_SENT = 'workspace.sync.dlq_sent',
  WORKSPACE_ACTION_DRAFTED = 'workspace_action.drafted',
  WORKSPACE_ACTION_EDITED = 'workspace_action.edited',
  WORKSPACE_ACTION_BULK_APPROVED = 'workspace_action.bulk_approved',
  WORKSPACE_ACTION_STALE_BLOCKED = 'workspace_action.stale_blocked',
  WORKSPACE_ACTION_APPROVED = 'workspace_action.approved',
  WORKSPACE_ACTION_REJECTED = 'workspace_action.rejected',
  WORKSPACE_ACTION_EXECUTED = 'workspace_action.executed',
  WORKSPACE_ACTION_FAILED = 'workspace_action.failed',
  AGENT_SESSION_CONNECTED = 'agent.session_connected',
  AGENT_SESSION_DISCONNECTED = 'agent.session_disconnected',
  AGENT_COMMAND_REQUESTED = 'agent.command_requested',
  AGENT_COMMAND_APPROVED = 'agent.command_approved',
  AGENT_COMMAND_REJECTED = 'agent.command_rejected',
  AGENT_COMMAND_COMPLETED = 'agent.command_completed',
  AGENT_DEVICE_PAIRED = 'agent.device_paired',
  AGENT_DEVICE_REVOKED = 'agent.device_revoked',
  AGENT_TOKEN_ROTATED = 'agent.token_rotated',
  AGENT_TOKEN_REUSE_DETECTED = 'agent.token_reuse_detected',
  AGENT_POLICY_VIOLATED = 'agent.policy_violated',
  AGENT_COMMAND_CANCELLED = 'agent.command_cancelled',
  AGENT_COMMAND_STREAMED = 'agent.command_streamed',
  // === Capability framework (Stream 10 — desktop-agent flagship) ===
  AGENT_CAPABILITY_PROPOSED = 'agent.capability.proposed',
  AGENT_CAPABILITY_POLICY_MATCHED = 'agent.capability.policy_matched',
  AGENT_CAPABILITY_AUTO_APPROVED = 'agent.capability.auto_approved',
  AGENT_CAPABILITY_APPROVED = 'agent.capability.approved',
  AGENT_CAPABILITY_REJECTED = 'agent.capability.rejected',
  AGENT_CAPABILITY_EXECUTING = 'agent.capability.executing',
  AGENT_CAPABILITY_EXECUTED = 'agent.capability.executed',
  AGENT_CAPABILITY_FAILED = 'agent.capability.failed',
  AGENT_CAPABILITY_CANCELLED = 'agent.capability.cancelled',
  AGENT_CAPABILITY_EXPIRED = 'agent.capability.expired',
  AGENT_CAPABILITY_ROLLED_BACK = 'agent.capability.rolled_back',
  AGENT_CAPABILITY_DENIED = 'agent.capability.denied',
  // === Local Frontier (Stream — claw-llamacpp-service) ===
  LLAMACPP_BINARY_INSTALLED = 'llamacpp.binary.installed',
  LLAMACPP_BINARY_UPDATED = 'llamacpp.binary.updated',
  LLAMACPP_PULL_STARTED = 'llamacpp.pull.started',
  LLAMACPP_PULL_PROGRESS = 'llamacpp.pull.progress',
  LLAMACPP_PULL_COMPLETED = 'llamacpp.pull.completed',
  LLAMACPP_PULL_FAILED = 'llamacpp.pull.failed',
  LLAMACPP_MODEL_LOADED = 'llamacpp.model.loaded',
  LLAMACPP_MODEL_UNLOADED = 'llamacpp.model.unloaded',
  LLAMACPP_MODEL_CRASHED = 'llamacpp.model.crashed',
  LLAMACPP_WEIGHTS_DELETED = 'llamacpp.weights.deleted',
  LLAMACPP_PREFLIGHT_OVERRIDDEN = 'llamacpp.preflight.overridden',
  // === Workspace Automation Stream 10 — AI Action Approval Engine ===
  AI_ACTION_SUGGESTION_CREATED = 'ai_action.suggestion_created',
  AI_ACTION_PENDING_APPROVAL = 'ai_action.pending_approval',
  AI_ACTION_AUTO_APPROVED = 'ai_action.auto_approved',
  AI_ACTION_APPROVED = 'ai_action.approved',
  AI_ACTION_REJECTED = 'ai_action.rejected',
  AI_ACTION_EXECUTED = 'ai_action.executed',
  AI_ACTION_DENIED = 'ai_action.denied',
  AI_ACTION_EXPIRED = 'ai_action.expired',
  AI_ACTION_EDITED = 'ai_action.edited',
  // Stream 02 (v3 polish, 2026-05-11) — admin policy CRUD audit trail
  AI_ACTION_POLICY_CREATED = 'ai_action.policy.created',
  AI_ACTION_POLICY_UPDATED = 'ai_action.policy.updated',
  AI_ACTION_POLICY_DELETED = 'ai_action.policy.deleted',
  // === Workspace Automation Stream 11 — Webhook Receiver ===
  WORKSPACE_WEBHOOK_RECEIVED = 'workspace.webhook.received',
  WORKSPACE_WEBHOOK_REJECTED = 'workspace.webhook.rejected',
  WORKSPACE_WEBHOOK_REPLAYED = 'workspace.webhook.replayed',
  // === Workspace Automation Stream 12 — Auto-Suggest Scheduler ===
  WORKSPACE_AUTO_SUGGEST_TICK_STARTED = 'workspace.auto_suggest.tick.started',
  WORKSPACE_AUTO_SUGGEST_TICK_COMPLETED = 'workspace.auto_suggest.tick.completed',
  WORKSPACE_AUTO_SUGGEST_TICK_FAILED = 'workspace.auto_suggest.tick.failed',
  // === Workspace Automation Stream 13 — Suggestion Factory ===
  WORKSPACE_SUGGESTION_FACTORY_PROCESSED = 'workspace.suggestion.factory_processed',
  // === Workspace Automation Phase 03 — Canonical Event Fabric ===
  // Published once a raw webhook delivery has been mapped to a normalized
  // WorkspaceEvent row. Downstream consumers (workflow triggers, the
  // knowledge graph, digest, learning, audit) subscribe to this instead of
  // re-parsing provider-specific webhook payloads themselves.
  WORKSPACE_EVENT_INGESTED = 'workspace.event.ingested',
  // === Workspace Automation Stream 40 — Memory Learning Loop ===
  MEMORY_PREFERENCE_UPSERTED = 'memory.preference.upserted',
  // === Smart Router Flagship (Phases 1, 7, 10, 12) ===
  ROUTING_PROFILE_CREATED = 'routing.profile.created',
  ROUTING_PROFILE_UPDATED = 'routing.profile.updated',
  ROUTING_PROFILE_LIFECYCLE_CHANGED = 'routing.profile.lifecycle_changed',
  ROUTING_POLICY_CHANGED = 'routing.policy.changed',
  ROUTING_LEARNED_SCORE_UPDATED = 'routing.learned_score.updated',
  ROUTING_NO_EXECUTION_MODEL = 'routing.no_execution_model',
  ROUTING_CIRCUIT_BREAKER_OPENED = 'routing.circuit_breaker.opened',
  ROUTING_CIRCUIT_BREAKER_CLOSED = 'routing.circuit_breaker.closed',
  ROUTING_CIRCUIT_BREAKER_HALF_OPEN = 'routing.circuit_breaker.half_open',
  // === Cloud Smart Router — safe routing trace ===
  // One batch per routing decision rather than one message per event: a walk
  // emits up to ~30 events, and 30 separate publishes per request would put
  // more load on the bus than the routing itself.
  ROUTER_TRACE_EMITTED = 'router.trace.emitted',
  // === Smart Router Flagship (Phase 6 — model knowledge sync) ===
  ROUTING_MODELS_SYNCED = 'routing.models.synced',
  // === Memory V2 Flagship (suggestion queue, scopes, sensitivity, audit, usage) ===
  MEMORY_SUGGESTED = 'memory.suggested',
  MEMORY_APPROVED = 'memory.approved',
  MEMORY_REJECTED = 'memory.rejected',
  MEMORY_USED = 'memory.used',
  MEMORY_FORGOTTEN = 'memory.forgotten',
  MEMORY_PAUSED = 'memory.paused',
  MEMORY_REDACTED = 'memory.redacted',
  // === Context V2 Flagship (scopes, versions, usage, attachments, sharing) ===
  CONTEXT_PACK_CREATED = 'context_pack.created',
  CONTEXT_PACK_UPDATED = 'context_pack.updated',
  CONTEXT_PACK_DELETED = 'context_pack.deleted',
  CONTEXT_PACK_ATTACHED = 'context_pack.attached',
  CONTEXT_PACK_DETACHED = 'context_pack.detached',
  CONTEXT_PACK_USED = 'context_pack.used',
  CONTEXT_PACK_VERSION_CREATED = 'context_pack.version_created',
  CONTEXT_PACK_VERSION_REVERTED = 'context_pack.version_reverted',
  CONTEXT_PACK_SHARED = 'context_pack.shared',
  // === Public read-only chat shares (claw-chat-service -> audit) ===
  // Carry ids and state transitions only. A share event must never contain
  // conversation text or the public identifier: the bus and the audit
  // collection both outlive a revocation, and the identifier is the bearer
  // credential for the public page.
  CHAT_SHARE_PUBLISHED = 'chat.share.published',
  CHAT_SHARE_UPDATED = 'chat.share.updated',
  CHAT_SHARE_VISIBILITY_CHANGED = 'chat.share.visibility_changed',
  CHAT_SHARE_REVOKED = 'chat.share.revoked',
  CHAT_SHARE_URL_REGENERATED = 'chat.share.url_regenerated',
  CHAT_SHARE_SAFETY_REJECTED = 'chat.share.safety_rejected',
  // === Memory + Context Integration V2 (receipts + thread toggles) ===
  CONTEXT_RECEIPT_WRITTEN = 'context.receipt_written',
  CHAT_THREAD_MEMORY_TOGGLED = 'chat_thread.memory_toggled',
  CHAT_THREAD_CONTEXT_TOGGLED = 'chat_thread.context_toggled',
  // === Subscriptions & Payments (claw-payment-service -> auth inbox + audit) ===
  // Published from a transactional outbox in the payment database so an
  // entitlement change can never be lost between commit and publish. Auth
  // consumes them through an inbox table keyed on the envelope's eventId.
  BILLING_SUBSCRIPTION_ACTIVATED = 'billing.subscription.activated',
  BILLING_SUBSCRIPTION_RENEWED = 'billing.subscription.renewed',
  BILLING_SUBSCRIPTION_UPGRADED = 'billing.subscription.upgraded',
  BILLING_SUBSCRIPTION_DOWNGRADE_SCHEDULED = 'billing.subscription.downgrade_scheduled',
  BILLING_SUBSCRIPTION_DOWNGRADED = 'billing.subscription.downgraded',
  BILLING_SUBSCRIPTION_CANCELLED = 'billing.subscription.cancelled',
  BILLING_SUBSCRIPTION_EXPIRED = 'billing.subscription.expired',
  BILLING_SUBSCRIPTION_PAST_DUE = 'billing.subscription.past_due',
  BILLING_SUBSCRIPTION_SUSPENDED = 'billing.subscription.suspended',
  BILLING_PAYMENT_REFUNDED = 'billing.payment.refunded',
  BILLING_PAYMENT_CHARGEBACK = 'billing.payment.chargeback',
  BILLING_ENTITLEMENT_RECONCILE_REQUESTED = 'billing.entitlement.reconcile_requested',
  // === PAYG connector credit (ADR-078) ===
  // Money in. Published from the payment outbox in the same transaction that
  // records the charge, consumed by the auth inbox keyed on the envelope
  // eventId so a redelivered webhook cannot grant the credit twice.
  //
  // ORDERING IS LOAD-BEARING: the topic exchange discards a routing key with no
  // bound queue, and queues are asserted by the CONSUMER at boot. If payment
  // drains a credit event before auth has ever subscribed, the money is taken,
  // the outbox row is marked published, and nothing reaches a DLQ. auth-service
  // must be healthy before payment-service starts.
  BILLING_CREDIT_TOPUP_SUCCEEDED = 'billing.credit.topup_succeeded',
  BILLING_CREDIT_TOPUP_REVERSED = 'billing.credit.topup_reversed',
  // Wallet lifecycle, published by auth for audit and notification. Never
  // carries a balance in a log-visible field beyond the threshold that fired.
  CREDIT_BALANCE_LOW = 'credit.balance.low',
  CREDIT_BALANCE_EXHAUSTED = 'credit.balance.exhausted',
  CREDIT_GRANT_RENEWED = 'credit.grant.renewed',
  // Price change. Auth caches provider rates to keep the reservation path off
  // a synchronous routing hop; this is what makes an admin repricing apply on
  // the next request instead of at the end of the cache TTL.
  ROUTING_MODEL_COST_PUBLISHED = 'routing.model_cost.published',
}
