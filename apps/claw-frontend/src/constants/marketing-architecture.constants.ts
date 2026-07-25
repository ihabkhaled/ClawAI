import type {
  MarketingArchitectureItem,
  MarketingArchitectureService,
  MarketingArchitectureStat,
  MarketingArchitectureStep,
  MarketingArchitectureStore,
} from '@/types/marketing-architecture.types';

// Content descriptors for the public /architecture page. Each entry holds i18n
// key references (resolved with t() inside the section components) plus the
// infrastructure brand literals that are never translated.

// Headline figures for the platform overview. Values are keys because some of
// them read as phrases ("one per service") rather than bare numerals.
export const ARCHITECTURE_OVERVIEW_STATS: ReadonlyArray<MarketingArchitectureStat> = [
  {
    valueKey: 'marketing.architecturePage.overview.statServicesValue',
    labelKey: 'marketing.architecturePage.overview.statServicesLabel',
  },
  {
    valueKey: 'marketing.architecturePage.overview.statDatabasesValue',
    labelKey: 'marketing.architecturePage.overview.statDatabasesLabel',
  },
  {
    valueKey: 'marketing.architecturePage.overview.statTransportsValue',
    labelKey: 'marketing.architecturePage.overview.statTransportsLabel',
  },
  {
    valueKey: 'marketing.architecturePage.overview.statEdgeValue',
    labelKey: 'marketing.architecturePage.overview.statEdgeLabel',
  },
];

// The services a reader evaluating the platform actually cares about, in the
// order a request tends to touch them. `store` names the database that service
// owns — nothing else is allowed to connect to it.
export const ARCHITECTURE_SERVICES: ReadonlyArray<MarketingArchitectureService> = [
  {
    nameKey: 'marketing.architecturePage.services.authName',
    descKey: 'marketing.architecturePage.services.authDesc',
    store: 'PostgreSQL',
  },
  {
    nameKey: 'marketing.architecturePage.services.chatName',
    descKey: 'marketing.architecturePage.services.chatDesc',
    store: 'PostgreSQL',
  },
  {
    nameKey: 'marketing.architecturePage.services.routingName',
    descKey: 'marketing.architecturePage.services.routingDesc',
    store: 'PostgreSQL',
  },
  {
    nameKey: 'marketing.architecturePage.services.connectorName',
    descKey: 'marketing.architecturePage.services.connectorDesc',
    store: 'PostgreSQL',
  },
  {
    nameKey: 'marketing.architecturePage.services.memoryName',
    descKey: 'marketing.architecturePage.services.memoryDesc',
    store: 'PostgreSQL + pgvector',
  },
  {
    nameKey: 'marketing.architecturePage.services.fileName',
    descKey: 'marketing.architecturePage.services.fileDesc',
    store: 'PostgreSQL',
  },
  {
    nameKey: 'marketing.architecturePage.services.researchName',
    descKey: 'marketing.architecturePage.services.researchDesc',
    store: 'PostgreSQL',
  },
  {
    nameKey: 'marketing.architecturePage.services.workspaceName',
    descKey: 'marketing.architecturePage.services.workspaceDesc',
    store: 'PostgreSQL',
  },
  {
    nameKey: 'marketing.architecturePage.services.imageName',
    descKey: 'marketing.architecturePage.services.imageDesc',
    store: 'PostgreSQL',
  },
  {
    nameKey: 'marketing.architecturePage.services.fileGenerationName',
    descKey: 'marketing.architecturePage.services.fileGenerationDesc',
    store: 'PostgreSQL',
  },
  {
    nameKey: 'marketing.architecturePage.services.paymentName',
    descKey: 'marketing.architecturePage.services.paymentDesc',
    store: 'PostgreSQL',
  },
  {
    nameKey: 'marketing.architecturePage.services.auditName',
    descKey: 'marketing.architecturePage.services.auditDesc',
    store: 'MongoDB',
  },
  {
    nameKey: 'marketing.architecturePage.services.logsName',
    descKey: 'marketing.architecturePage.services.logsDesc',
    store: 'MongoDB',
  },
];

// The rules that make one-database-per-service hold in practice.
export const ARCHITECTURE_DATA_OWNERSHIP_RULES: ReadonlyArray<MarketingArchitectureItem> = [
  {
    nameKey: 'marketing.architecturePage.dataOwnership.rule1Name',
    descKey: 'marketing.architecturePage.dataOwnership.rule1Desc',
  },
  {
    nameKey: 'marketing.architecturePage.dataOwnership.rule2Name',
    descKey: 'marketing.architecturePage.dataOwnership.rule2Desc',
  },
  {
    nameKey: 'marketing.architecturePage.dataOwnership.rule3Name',
    descKey: 'marketing.architecturePage.dataOwnership.rule3Desc',
  },
  {
    nameKey: 'marketing.architecturePage.dataOwnership.rule4Name',
    descKey: 'marketing.architecturePage.dataOwnership.rule4Desc',
  },
];

// End-to-end path of a single prompt, in execution order.
export const ARCHITECTURE_LIFECYCLE_STEPS: ReadonlyArray<MarketingArchitectureStep> = [
  {
    titleKey: 'marketing.architecturePage.lifecycle.step1Title',
    descKey: 'marketing.architecturePage.lifecycle.step1Desc',
  },
  {
    titleKey: 'marketing.architecturePage.lifecycle.step2Title',
    descKey: 'marketing.architecturePage.lifecycle.step2Desc',
  },
  {
    titleKey: 'marketing.architecturePage.lifecycle.step3Title',
    descKey: 'marketing.architecturePage.lifecycle.step3Desc',
  },
  {
    titleKey: 'marketing.architecturePage.lifecycle.step4Title',
    descKey: 'marketing.architecturePage.lifecycle.step4Desc',
  },
  {
    titleKey: 'marketing.architecturePage.lifecycle.step5Title',
    descKey: 'marketing.architecturePage.lifecycle.step5Desc',
  },
  {
    titleKey: 'marketing.architecturePage.lifecycle.step6Title',
    descKey: 'marketing.architecturePage.lifecycle.step6Desc',
  },
  {
    titleKey: 'marketing.architecturePage.lifecycle.step7Title',
    descKey: 'marketing.architecturePage.lifecycle.step7Desc',
  },
  {
    titleKey: 'marketing.architecturePage.lifecycle.step8Title',
    descKey: 'marketing.architecturePage.lifecycle.step8Desc',
  },
];

// Delivery guarantees of the RabbitMQ topic exchange.
export const ARCHITECTURE_EVENT_GUARANTEES: ReadonlyArray<MarketingArchitectureItem> = [
  {
    nameKey: 'marketing.architecturePage.events.topicName',
    descKey: 'marketing.architecturePage.events.topicDesc',
  },
  {
    nameKey: 'marketing.architecturePage.events.retryName',
    descKey: 'marketing.architecturePage.events.retryDesc',
  },
  {
    nameKey: 'marketing.architecturePage.events.dlqName',
    descKey: 'marketing.architecturePage.events.dlqDesc',
  },
  {
    nameKey: 'marketing.architecturePage.events.idempotencyName',
    descKey: 'marketing.architecturePage.events.idempotencyDesc',
  },
  {
    nameKey: 'marketing.architecturePage.events.auditName',
    descKey: 'marketing.architecturePage.events.auditDesc',
  },
];

// What travels down the Server-Sent Events channel while a model generates.
export const ARCHITECTURE_STREAM_SIGNALS: ReadonlyArray<MarketingArchitectureItem> = [
  {
    nameKey: 'marketing.architecturePage.streaming.stagesName',
    descKey: 'marketing.architecturePage.streaming.stagesDesc',
  },
  {
    nameKey: 'marketing.architecturePage.streaming.contentName',
    descKey: 'marketing.architecturePage.streaming.contentDesc',
  },
  {
    nameKey: 'marketing.architecturePage.streaming.reasoningName',
    descKey: 'marketing.architecturePage.streaming.reasoningDesc',
  },
  {
    nameKey: 'marketing.architecturePage.streaming.metricsName',
    descKey: 'marketing.architecturePage.streaming.metricsDesc',
  },
  {
    nameKey: 'marketing.architecturePage.streaming.terminalName',
    descKey: 'marketing.architecturePage.streaming.terminalDesc',
  },
];

// The stores and what each is used for. `name` is a product brand and stays
// identical in every locale; only the description is translated.
export const ARCHITECTURE_DATA_STORES: ReadonlyArray<MarketingArchitectureStore> = [
  { name: 'PostgreSQL', descKey: 'marketing.architecturePage.dataLayer.postgresDesc' },
  { name: 'pgvector', descKey: 'marketing.architecturePage.dataLayer.pgvectorDesc' },
  { name: 'MongoDB', descKey: 'marketing.architecturePage.dataLayer.mongoDesc' },
  { name: 'Redis', descKey: 'marketing.architecturePage.dataLayer.redisDesc' },
];

// Security mechanisms that exist in the product. Deliberately mechanisms only —
// no certification or compliance claims.
export const ARCHITECTURE_SECURITY_CONTROLS: ReadonlyArray<MarketingArchitectureItem> = [
  {
    nameKey: 'marketing.architecturePage.security.tokensName',
    descKey: 'marketing.architecturePage.security.tokensDesc',
  },
  {
    nameKey: 'marketing.architecturePage.security.passwordsName',
    descKey: 'marketing.architecturePage.security.passwordsDesc',
  },
  {
    nameKey: 'marketing.architecturePage.security.rbacName',
    descKey: 'marketing.architecturePage.security.rbacDesc',
  },
  {
    nameKey: 'marketing.architecturePage.security.credentialsName',
    descKey: 'marketing.architecturePage.security.credentialsDesc',
  },
  {
    nameKey: 'marketing.architecturePage.security.validationName',
    descKey: 'marketing.architecturePage.security.validationDesc',
  },
  {
    nameKey: 'marketing.architecturePage.security.rateLimitName',
    descKey: 'marketing.architecturePage.security.rateLimitDesc',
  },
  {
    nameKey: 'marketing.architecturePage.security.headersName',
    descKey: 'marketing.architecturePage.security.headersDesc',
  },
  {
    nameKey: 'marketing.architecturePage.security.transportName',
    descKey: 'marketing.architecturePage.security.transportDesc',
  },
  {
    nameKey: 'marketing.architecturePage.security.redactionName',
    descKey: 'marketing.architecturePage.security.redactionDesc',
  },
];

// Signals emitted by every service, and where they land.
export const ARCHITECTURE_OBSERVABILITY_SIGNALS: ReadonlyArray<MarketingArchitectureItem> = [
  {
    nameKey: 'marketing.architecturePage.observability.logsName',
    descKey: 'marketing.architecturePage.observability.logsDesc',
  },
  {
    nameKey: 'marketing.architecturePage.observability.correlationName',
    descKey: 'marketing.architecturePage.observability.correlationDesc',
  },
  {
    nameKey: 'marketing.architecturePage.observability.auditName',
    descKey: 'marketing.architecturePage.observability.auditDesc',
  },
  {
    nameKey: 'marketing.architecturePage.observability.usageName',
    descKey: 'marketing.architecturePage.observability.usageDesc',
  },
  {
    nameKey: 'marketing.architecturePage.observability.healthName',
    descKey: 'marketing.architecturePage.observability.healthDesc',
  },
];

// How the platform behaves when a provider or a service misbehaves.
export const ARCHITECTURE_RELIABILITY_MECHANISMS: ReadonlyArray<MarketingArchitectureItem> = [
  {
    nameKey: 'marketing.architecturePage.reliability.fallbackName',
    descKey: 'marketing.architecturePage.reliability.fallbackDesc',
  },
  {
    nameKey: 'marketing.architecturePage.reliability.circuitName',
    descKey: 'marketing.architecturePage.reliability.circuitDesc',
  },
  {
    nameKey: 'marketing.architecturePage.reliability.idempotencyName',
    descKey: 'marketing.architecturePage.reliability.idempotencyDesc',
  },
  {
    nameKey: 'marketing.architecturePage.reliability.visibleErrorsName',
    descKey: 'marketing.architecturePage.reliability.visibleErrorsDesc',
  },
  {
    nameKey: 'marketing.architecturePage.reliability.isolationName',
    descKey: 'marketing.architecturePage.reliability.isolationDesc',
  },
];

// On-premise deployment is an enterprise conversation, not a self-serve
// feature — the architecture page only points at the contact form.
export const MARKETING_ARCHITECTURE_CONTACT_PATH = '/contact';

// Metadata fallbacks. The content registry entry for this slug carries the
// canonical title/description once it is flipped to PUBLISHED; these values
// keep the document head valid before that happens.
export const MARKETING_ARCHITECTURE_FALLBACK_TITLE = 'ClawAI Architecture';
export const MARKETING_ARCHITECTURE_FALLBACK_DESCRIPTION =
  'How ClawAI is built: 18 independently deployable services behind a reverse proxy, one database per service, an event bus with retries and a dead-letter queue, streaming responses, and encryption at every boundary.';
export const MARKETING_ARCHITECTURE_CANONICAL_PATH = '/architecture';
export const MARKETING_ARCHITECTURE_OG_IMAGE_ALT = 'ClawAI platform architecture';
