import type {
  HowItWorksJourneyStep,
  HowItWorksModelFamily,
  HowItWorksNamedEntry,
} from '@/types/marketing-how-it-works.types';

// Data arrays for the dedicated /how-it-works marketing page.
//
// All copy lives in the locale files under `marketing.howItWorksPage.*`; these
// arrays only carry the key references and the brand-name literals, so the
// page structure and the translations can evolve independently.

/// The eight-step journey from sign-up to allowance tracking. Rendered as the
/// page's overview; each later section expands one or two of these steps.
export const HOW_IT_WORKS_JOURNEY_STEPS: ReadonlyArray<HowItWorksJourneyStep> = [
  {
    titleKey: 'marketing.howItWorksPage.journey.step1Title',
    descKey: 'marketing.howItWorksPage.journey.step1Desc',
  },
  {
    titleKey: 'marketing.howItWorksPage.journey.step2Title',
    descKey: 'marketing.howItWorksPage.journey.step2Desc',
  },
  {
    titleKey: 'marketing.howItWorksPage.journey.step3Title',
    descKey: 'marketing.howItWorksPage.journey.step3Desc',
  },
  {
    titleKey: 'marketing.howItWorksPage.journey.step4Title',
    descKey: 'marketing.howItWorksPage.journey.step4Desc',
  },
  {
    titleKey: 'marketing.howItWorksPage.journey.step5Title',
    descKey: 'marketing.howItWorksPage.journey.step5Desc',
  },
  {
    titleKey: 'marketing.howItWorksPage.journey.step6Title',
    descKey: 'marketing.howItWorksPage.journey.step6Desc',
  },
  {
    titleKey: 'marketing.howItWorksPage.journey.step7Title',
    descKey: 'marketing.howItWorksPage.journey.step7Desc',
  },
  {
    titleKey: 'marketing.howItWorksPage.journey.step8Title',
    descKey: 'marketing.howItWorksPage.journey.step8Desc',
  },
];

/// Plan bullets on the "create an account / pick a plan" section.
export const HOW_IT_WORKS_PLAN_BULLET_KEYS: ReadonlyArray<string> = [
  'marketing.howItWorksPage.account.bullet1',
  'marketing.howItWorksPage.account.bullet2',
  'marketing.howItWorksPage.account.bullet3',
  'marketing.howItWorksPage.account.bullet4',
];

/// Frontier model families reachable from the hosted app. Vendor and model
/// names are brand names — identical in every locale, so they are literals.
export const HOW_IT_WORKS_MODEL_FAMILIES: ReadonlyArray<HowItWorksModelFamily> = [
  {
    name: 'Anthropic Claude',
    models: ['Claude Opus 5', 'Claude Sonnet 5', 'Claude Fable 5'],
    strengthKey: 'marketing.howItWorksPage.models.anthropicStrength',
  },
  {
    name: 'OpenAI GPT',
    models: ['GPT-5', 'GPT-5 mini'],
    strengthKey: 'marketing.howItWorksPage.models.openaiStrength',
  },
  {
    name: 'Google Gemini',
    models: ['Gemini 3 Pro', 'Gemini 3 Flash'],
    strengthKey: 'marketing.howItWorksPage.models.geminiStrength',
  },
  {
    name: 'Moonshot Kimi',
    models: ['Kimi K2'],
    strengthKey: 'marketing.howItWorksPage.models.kimiStrength',
  },
  {
    name: 'Zhipu GLM',
    models: ['GLM-5.1'],
    strengthKey: 'marketing.howItWorksPage.models.glmStrength',
  },
  {
    name: 'Alibaba Qwen',
    models: ['Qwen3'],
    strengthKey: 'marketing.howItWorksPage.models.qwenStrength',
  },
  {
    name: 'DeepSeek',
    models: ['DeepSeek V3.2'],
    strengthKey: 'marketing.howItWorksPage.models.deepseekStrength',
  },
  {
    name: 'xAI Grok',
    models: ['Grok 4'],
    strengthKey: 'marketing.howItWorksPage.models.grokStrength',
  },
  {
    name: 'Amazon Bedrock',
    models: ['Nova Pro', 'Bedrock-hosted Claude'],
    strengthKey: 'marketing.howItWorksPage.models.bedrockStrength',
  },
];

/// Task classes the AUTO router recognises, in the order the page presents them.
export const HOW_IT_WORKS_ROUTING_CLASSES: ReadonlyArray<HowItWorksNamedEntry> = [
  {
    nameKey: 'marketing.howItWorksPage.routing.classCodingName',
    descKey: 'marketing.howItWorksPage.routing.classCodingDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.routing.classReasoningName',
    descKey: 'marketing.howItWorksPage.routing.classReasoningDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.routing.classCreativeName',
    descKey: 'marketing.howItWorksPage.routing.classCreativeDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.routing.classAnalysisName',
    descKey: 'marketing.howItWorksPage.routing.classAnalysisDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.routing.classImageName',
    descKey: 'marketing.howItWorksPage.routing.classImageDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.routing.classEverydayName',
    descKey: 'marketing.howItWorksPage.routing.classEverydayDesc',
  },
];

/// Multi-model orchestration modes unlocked on paid plans.
export const HOW_IT_WORKS_ORCHESTRATION_MODES: ReadonlyArray<HowItWorksNamedEntry> = [
  {
    nameKey: 'marketing.howItWorksPage.orchestration.compareName',
    descKey: 'marketing.howItWorksPage.orchestration.compareDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.orchestration.consensusName',
    descKey: 'marketing.howItWorksPage.orchestration.consensusDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.orchestration.escalationName',
    descKey: 'marketing.howItWorksPage.orchestration.escalationDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.orchestration.bestOfNName',
    descKey: 'marketing.howItWorksPage.orchestration.bestOfNDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.orchestration.judgeName',
    descKey: 'marketing.howItWorksPage.orchestration.judgeDesc',
  },
];

/// The three durable context layers assembled into every request.
export const HOW_IT_WORKS_CONTEXT_LAYERS: ReadonlyArray<HowItWorksNamedEntry> = [
  {
    nameKey: 'marketing.howItWorksPage.context.memoryName',
    descKey: 'marketing.howItWorksPage.context.memoryDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.context.packsName',
    descKey: 'marketing.howItWorksPage.context.packsDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.context.filesName',
    descKey: 'marketing.howItWorksPage.context.filesDesc',
  },
];

/// What the per-answer receipt and the usage dashboard expose.
export const HOW_IT_WORKS_TRANSPARENCY_ITEMS: ReadonlyArray<HowItWorksNamedEntry> = [
  {
    nameKey: 'marketing.howItWorksPage.transparency.modelName',
    descKey: 'marketing.howItWorksPage.transparency.modelDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.transparency.reasonName',
    descKey: 'marketing.howItWorksPage.transparency.reasonDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.transparency.costName',
    descKey: 'marketing.howItWorksPage.transparency.costDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.transparency.contextName',
    descKey: 'marketing.howItWorksPage.transparency.contextDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.transparency.usageName',
    descKey: 'marketing.howItWorksPage.transparency.usageDesc',
  },
];

/// Weight bands used to explain cost-normalized tokens in plain language.
export const HOW_IT_WORKS_ALLOWANCE_EXAMPLES: ReadonlyArray<HowItWorksNamedEntry> = [
  {
    nameKey: 'marketing.howItWorksPage.allowance.exampleLightName',
    descKey: 'marketing.howItWorksPage.allowance.exampleLightDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.allowance.exampleBalancedName',
    descKey: 'marketing.howItWorksPage.allowance.exampleBalancedDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.allowance.exampleFrontierName',
    descKey: 'marketing.howItWorksPage.allowance.exampleFrontierDesc',
  },
];

/// The three rolling windows an allowance is measured over.
export const HOW_IT_WORKS_ALLOWANCE_WINDOWS: ReadonlyArray<HowItWorksNamedEntry> = [
  {
    nameKey: 'marketing.howItWorksPage.allowance.windowDailyName',
    descKey: 'marketing.howItWorksPage.allowance.windowDailyDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.allowance.windowWeeklyName',
    descKey: 'marketing.howItWorksPage.allowance.windowWeeklyDesc',
  },
  {
    nameKey: 'marketing.howItWorksPage.allowance.windowMonthlyName',
    descKey: 'marketing.howItWorksPage.allowance.windowMonthlyDesc',
  },
];
