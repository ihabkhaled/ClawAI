# Data Ownership

Repository rule: each service owns its persistence. Cross-service access is HTTP or RabbitMQ.

| Service | Database | Prisma models | Mongoose models |
| --- | --- | --- | --- |
| claw-agent-service | postgresql | AccessPolicy, ActivityMemoryEntry, AgentSession, AgentSuggestion, CapabilityInvocation, Device, DeviceCodeRequest, FileWatchEvent, LocalRepo, MarketplaceInstall, MarketplaceListing, Organization, OrganizationMember, OrganizationPolicy, PairingRequest, Recipe, RecipeRun, RecipeRunStep, RefreshToken, ScheduledCommand, TerminalCommand | — |
| claw-audit-service | mongodb | — | AuditLog, FeedbackCounter, FeedbackTicket, UsageLedger |
| claw-auth-service | postgresql | CreditLedgerEntry, CreditPackage, CreditPackageVersion, DeploymentCredential, DeviceAuthorizationGrant, EmailChangeRequest, EmailVerificationToken, EntitlementInboxEvent, FeatureUsageRecord, PasswordResetToken, Plan, PlanFeatureRule, PlanModelAccess, PlanPriceVersion, PlanRetirementMigration, PlanTrialRedemption, Role, RolePermission, SeedExecution, Session, SystemSetting, TokenUsageLedger, User, UserCreditWallet, UserPlanAssignment, WeightedUsageRecord | — |
| claw-chat-service | postgresql | ChatMessage, ChatMessageContextReceipt, ChatShare, ChatShareMessage, ChatShareMessageAsset, ChatThread, FileDeliveryRecord, MessageAttachment | — |
| claw-client-logs-service | mongodb | — | ClientLog |
| claw-connector-service | postgresql | Connector, ConnectorHealthEvent, ConnectorModel, ModelSyncRun | — |
| claw-file-generation-service | postgresql | FileGeneration, FileGenerationAsset, FileGenerationEvent | — |
| claw-file-service | postgresql | File, FileChunk | — |
| claw-image-service | postgresql | ImageGeneration, ImageGenerationAsset, ImageGenerationEvent | — |
| claw-llamacpp-service | postgresql | BinaryRelease, FrontierCatalogEntry, HardwareSnapshot, ModelLoadEvent, PreflightOverrideAudit, PullJob, RuntimeConfig | — |
| claw-memory-service | postgresql | ContextPack, ContextPackAttachment, ContextPackItem, ContextPackTemplate, ContextPackUsage, ContextPackVersion, MemoryAuditLog, MemoryPreference, MemoryRecord, MemorySuggestion, MemoryUsage, WorkspaceObjectEmbedding | — |
| claw-ollama-service | postgresql | DiscoverySource, LocalModel, LocalModelRoleAssignment, ModelCatalogEntry, ModelDiscoveryCandidate, ModelDiscoveryRun, PullJob, RuntimeConfig | — |
| claw-payment-service | postgresql | BillingCustomer, CheckoutSession, FxQuote, GatewayConfiguration, GatewayPlanMapping, IdempotencyRecord, InboxEvent, Invoice, InvoiceDelivery, InvoiceLine, OutboxEvent, PaymentMethod, PaymentTransaction, ProrationQuote, ReconciliationDivergence, ReconciliationRun, Refund, SeedExecution, Subscription, WebhookEvent | — |
| claw-research-service | postgresql | FetchJob, PageCache, ResearchRun, SearchProvider, SearchRun | — |
| claw-routing-service | postgresql | AssistantModel, CapabilityEvidence, ModelCostVersion, ModelDeployment, ReplayCase, ReplayRun, RouterAdminOverride, RouterChainEntry, RouterCircuitBreaker, RouterConfiguration, RouterLearnedScore, RouterModelProfile, RouterModelRegistry, RouterProviderAttempt, RouterTopicProfile, RouterWorkflow, RouterWorkspacePrior, RoutingCalibrationSnapshot, RoutingCandidateScore, RoutingDecision, RoutingFeedbackRecord, RoutingOutcomeRecord, RoutingPolicy, SeedExecution, TaxonomyRole | — |
| claw-server-logs-service | mongodb | — | ServerLog |
| claw-workspace-service | postgresql | AiActionApprovalQueue, AiActionPolicy, AutoSuggestRun, DigestSnapshot, ImplPromptHandoff, SuggestionDeduplication, SuggestionTriggerRule, SyncCadenceDefault, UserAutomationPreference, UserDigestPreference, UserEmailSignature, UserEmailTemplate, WebhookDelivery, WorkspaceAction, WorkspaceChain, WorkspaceChainRun, WorkspaceChainRunStep, WorkspaceChainTemplate, WorkspaceConnector, WorkspaceConnectorGrant, WorkspaceConnectorGrantAuditLog, WorkspaceEvent, WorkspaceHealthEvent, WorkspaceObject, WorkspaceObjectLink, WorkspaceProviderAppConfig, WorkspaceProviderDefinition, WorkspaceSyncRun | — |

Source: [.ai/manifests/data-ownership.json](https://github.com/ihabkhaled/ClawAI/blob/main/.ai/manifests/data-ownership.json).
