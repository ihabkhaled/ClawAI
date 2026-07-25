import type {
  MarketingFeatureConnector,
  MarketingFeatureItem,
  MarketingFeatureModelFamily,
} from '@/types/marketing-features.types';

// Content descriptors for the public /features page. Each entry holds i18n key
// references (resolved with t() inside the section components) plus the brand
// literals that never get translated.

// The frontier model families one ClawAI subscription reaches. Model names are
// brand names and stay identical in every locale; only descKey is translated.
export const FEATURES_MODEL_FAMILIES: ReadonlyArray<MarketingFeatureModelFamily> = [
  {
    name: 'Anthropic Claude',
    models: ['Claude Opus 5', 'Claude Sonnet 5', 'Claude Fable 5', 'Claude Haiku 4.5'],
    descKey: 'marketing.features.providers.anthropicDesc',
  },
  {
    name: 'OpenAI GPT',
    models: ['GPT-5', 'GPT-5 mini', 'GPT-4o', 'o4-mini'],
    descKey: 'marketing.features.providers.openaiDesc',
  },
  {
    name: 'Google Gemini',
    models: ['Gemini 3 Pro', 'Gemini 3 Flash', 'Gemini 2.5 Flash'],
    descKey: 'marketing.features.providers.geminiDesc',
  },
  {
    name: 'Moonshot Kimi',
    models: ['Kimi K2', 'Kimi K2 Thinking'],
    descKey: 'marketing.features.providers.kimiDesc',
  },
  {
    name: 'Zhipu GLM',
    models: ['GLM-5.1', 'GLM-5', 'GLM-4.7 Thinking'],
    descKey: 'marketing.features.providers.glmDesc',
  },
  {
    name: 'Alibaba Qwen',
    models: ['Qwen3 235B', 'Qwen3 80B', 'Qwen3-Coder-Next'],
    descKey: 'marketing.features.providers.qwenDesc',
  },
  {
    name: 'DeepSeek',
    models: ['DeepSeek V3.2', 'DeepSeek R1 0528'],
    descKey: 'marketing.features.providers.deepseekDesc',
  },
  {
    name: 'xAI Grok',
    models: ['Grok 4', 'Grok 4 Fast'],
    descKey: 'marketing.features.providers.grokDesc',
  },
  {
    name: 'Amazon Bedrock',
    models: ['Nova Pro', 'Titan', 'Bedrock-hosted Claude'],
    descKey: 'marketing.features.providers.bedrockDesc',
  },
];

export const FEATURES_ROUTING_MODES: ReadonlyArray<MarketingFeatureItem> = [
  {
    nameKey: 'marketing.features.routing.autoName',
    descKey: 'marketing.features.routing.autoDesc',
  },
  {
    nameKey: 'marketing.features.routing.manualName',
    descKey: 'marketing.features.routing.manualDesc',
  },
  {
    nameKey: 'marketing.features.routing.lowLatencyName',
    descKey: 'marketing.features.routing.lowLatencyDesc',
  },
  {
    nameKey: 'marketing.features.routing.highReasoningName',
    descKey: 'marketing.features.routing.highReasoningDesc',
  },
  {
    nameKey: 'marketing.features.routing.costSaverName',
    descKey: 'marketing.features.routing.costSaverDesc',
  },
];

export const FEATURES_ORCHESTRATION_PRIMITIVES: ReadonlyArray<MarketingFeatureItem> = [
  {
    nameKey: 'marketing.features.orchestration.compareName',
    descKey: 'marketing.features.orchestration.compareDesc',
  },
  {
    nameKey: 'marketing.features.orchestration.consensusName',
    descKey: 'marketing.features.orchestration.consensusDesc',
  },
  {
    nameKey: 'marketing.features.orchestration.escalationName',
    descKey: 'marketing.features.orchestration.escalationDesc',
  },
  {
    nameKey: 'marketing.features.orchestration.bestOfNName',
    descKey: 'marketing.features.orchestration.bestOfNDesc',
  },
  {
    nameKey: 'marketing.features.orchestration.repairName',
    descKey: 'marketing.features.orchestration.repairDesc',
  },
  {
    nameKey: 'marketing.features.orchestration.verifyName',
    descKey: 'marketing.features.orchestration.verifyDesc',
  },
  {
    nameKey: 'marketing.features.orchestration.rolePackName',
    descKey: 'marketing.features.orchestration.rolePackDesc',
  },
  {
    nameKey: 'marketing.features.orchestration.pipelineName',
    descKey: 'marketing.features.orchestration.pipelineDesc',
  },
  {
    nameKey: 'marketing.features.orchestration.judgeName',
    descKey: 'marketing.features.orchestration.judgeDesc',
  },
];

export const FEATURES_MEMORY_ITEMS: ReadonlyArray<MarketingFeatureItem> = [
  {
    nameKey: 'marketing.features.memory.recordsName',
    descKey: 'marketing.features.memory.recordsDesc',
  },
  {
    nameKey: 'marketing.features.memory.suggestionsName',
    descKey: 'marketing.features.memory.suggestionsDesc',
  },
  {
    nameKey: 'marketing.features.memory.packsName',
    descKey: 'marketing.features.memory.packsDesc',
  },
  {
    nameKey: 'marketing.features.memory.scopesName',
    descKey: 'marketing.features.memory.scopesDesc',
  },
  {
    nameKey: 'marketing.features.memory.receiptsName',
    descKey: 'marketing.features.memory.receiptsDesc',
  },
  {
    nameKey: 'marketing.features.memory.controlsName',
    descKey: 'marketing.features.memory.controlsDesc',
  },
];

export const FEATURES_FILE_ITEMS: ReadonlyArray<MarketingFeatureItem> = [
  {
    nameKey: 'marketing.features.files.uploadName',
    descKey: 'marketing.features.files.uploadDesc',
  },
  {
    nameKey: 'marketing.features.files.chunkingName',
    descKey: 'marketing.features.files.chunkingDesc',
  },
  {
    nameKey: 'marketing.features.files.attachmentsName',
    descKey: 'marketing.features.files.attachmentsDesc',
  },
  {
    nameKey: 'marketing.features.files.deliveryName',
    descKey: 'marketing.features.files.deliveryDesc',
  },
  {
    nameKey: 'marketing.features.files.ocrName',
    descKey: 'marketing.features.files.ocrDesc',
  },
  {
    nameKey: 'marketing.features.files.scanningName',
    descKey: 'marketing.features.files.scanningDesc',
  },
];

// Connector vendor names are brand names — identical in every locale.
export const FEATURES_WORKSPACE_CONNECTORS: ReadonlyArray<MarketingFeatureConnector> = [
  { name: 'GitHub', descKey: 'marketing.features.workspace.githubDesc' },
  { name: 'GitLab', descKey: 'marketing.features.workspace.gitlabDesc' },
  { name: 'Bitbucket', descKey: 'marketing.features.workspace.bitbucketDesc' },
  { name: 'Jira', descKey: 'marketing.features.workspace.jiraDesc' },
  { name: 'ClickUp', descKey: 'marketing.features.workspace.clickupDesc' },
  { name: 'Slack', descKey: 'marketing.features.workspace.slackDesc' },
  { name: 'Gmail', descKey: 'marketing.features.workspace.gmailDesc' },
  { name: 'Google Drive', descKey: 'marketing.features.workspace.driveDesc' },
  { name: 'OneDrive', descKey: 'marketing.features.workspace.onedriveDesc' },
  { name: 'SharePoint', descKey: 'marketing.features.workspace.sharepointDesc' },
  { name: 'Confluence', descKey: 'marketing.features.workspace.confluenceDesc' },
  { name: 'Figma', descKey: 'marketing.features.workspace.figmaDesc' },
];

export const FEATURES_GENERATION_ITEMS: ReadonlyArray<MarketingFeatureItem> = [
  {
    nameKey: 'marketing.features.generation.imageName',
    descKey: 'marketing.features.generation.imageDesc',
  },
  {
    nameKey: 'marketing.features.generation.documentName',
    descKey: 'marketing.features.generation.documentDesc',
  },
  {
    nameKey: 'marketing.features.generation.researchName',
    descKey: 'marketing.features.generation.researchDesc',
  },
];

// Export formats are product tokens, identical in every locale.
export const FEATURES_GENERATION_FORMATS: readonly string[] = [
  'PDF',
  'DOCX',
  'CSV',
  'HTML',
  'Markdown',
  'TXT',
  'JSON',
];

export const FEATURES_OBSERVABILITY_ITEMS: ReadonlyArray<MarketingFeatureItem> = [
  {
    nameKey: 'marketing.features.observability.usageName',
    descKey: 'marketing.features.observability.usageDesc',
  },
  {
    nameKey: 'marketing.features.observability.transparencyName',
    descKey: 'marketing.features.observability.transparencyDesc',
  },
  {
    nameKey: 'marketing.features.observability.auditName',
    descKey: 'marketing.features.observability.auditDesc',
  },
  {
    nameKey: 'marketing.features.observability.progressName',
    descKey: 'marketing.features.observability.progressDesc',
  },
];

export const FEATURES_SECURITY_ITEMS: ReadonlyArray<MarketingFeatureItem> = [
  {
    nameKey: 'marketing.features.security.authName',
    descKey: 'marketing.features.security.authDesc',
  },
  {
    nameKey: 'marketing.features.security.rbacName',
    descKey: 'marketing.features.security.rbacDesc',
  },
  {
    nameKey: 'marketing.features.security.credentialsName',
    descKey: 'marketing.features.security.credentialsDesc',
  },
  {
    nameKey: 'marketing.features.security.rateLimitName',
    descKey: 'marketing.features.security.rateLimitDesc',
  },
  {
    nameKey: 'marketing.features.security.transportName',
    descKey: 'marketing.features.security.transportDesc',
  },
  {
    nameKey: 'marketing.features.security.isolationName',
    descKey: 'marketing.features.security.isolationDesc',
  },
];

// On-premise / self-managed deployment is an enterprise conversation, not a
// self-serve feature — the features page only points at the contact form.
export const MARKETING_FEATURES_CONTACT_PATH = '/contact';
