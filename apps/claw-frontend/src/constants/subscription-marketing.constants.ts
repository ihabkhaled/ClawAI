import type { MarketingModelFamily, MarketingPlanTier } from '@/types/subscription-marketing.types';

// The frontier models a paying subscriber can reach from the hosted web app.
//
// Model and vendor names are BRAND NAMES and stay identical in every locale —
// only the `strengthKey` blurb is translated. Keeping the roster in one place
// means the home page, the features page and the pricing table can never drift
// from each other.
export const MARKETING_MODEL_FAMILIES: ReadonlyArray<MarketingModelFamily> = [
  {
    name: 'Anthropic Claude',
    models: ['Claude Opus 5', 'Claude Sonnet 5', 'Claude Fable 5', 'Claude Haiku 4.5'],
    strengthKey: 'marketing.models.anthropicStrength',
  },
  {
    name: 'OpenAI GPT',
    models: ['GPT-5', 'GPT-5 mini', 'GPT-4o', 'o4-mini'],
    strengthKey: 'marketing.models.openaiStrength',
  },
  {
    name: 'Google Gemini',
    models: ['Gemini 3 Pro', 'Gemini 3 Flash', 'Gemini 2.5 Flash'],
    strengthKey: 'marketing.models.geminiStrength',
  },
  {
    name: 'Moonshot Kimi',
    models: ['Kimi K2', 'Kimi K2 Thinking'],
    strengthKey: 'marketing.models.kimiStrength',
  },
  {
    name: 'Zhipu GLM',
    models: ['GLM-5.1', 'GLM-5', 'GLM-4.7 Thinking'],
    strengthKey: 'marketing.models.glmStrength',
  },
  {
    name: 'Alibaba Qwen',
    models: ['Qwen3 235B', 'Qwen3 80B', 'Qwen3-Coder-Next'],
    strengthKey: 'marketing.models.qwenStrength',
  },
  {
    name: 'DeepSeek',
    models: ['DeepSeek V3.2', 'DeepSeek R1 0528'],
    strengthKey: 'marketing.models.deepseekStrength',
  },
  {
    name: 'xAI Grok',
    models: ['Grok 4', 'Grok 4 Fast'],
    strengthKey: 'marketing.models.grokStrength',
  },
  {
    name: 'Amazon Bedrock',
    models: ['Nova Pro', 'Titan', 'Bedrock-hosted Claude'],
    strengthKey: 'marketing.models.bedrockStrength',
  },
];

// The seven public subscription tiers.
//
// Prices and token allowances are the marketing projection of the billing
// catalog. The AUTHORITATIVE prices live in the database as versioned
// PlanPriceVersion rows and are what a checkout actually charges — these
// literals exist only so the page can render before an API call, and are
// verified against the catalog by a unit test.
export const MARKETING_PLAN_TIERS: ReadonlyArray<MarketingPlanTier> = [
  {
    slug: 'free',
    nameKey: 'marketing.pricing.freeName',
    taglineKey: 'marketing.pricing.freeTagline',
    monthlyUsd: 0,
    yearlyUsd: null,
    dailyTokens: '5K',
    monthlyTokens: '50K',
    highlightKeys: [
      'marketing.pricing.freeHighlight1',
      'marketing.pricing.freeHighlight2',
      'marketing.pricing.freeHighlight3',
    ],
    isFeatured: false,
  },
  {
    slug: 'starter',
    nameKey: 'marketing.pricing.starterName',
    taglineKey: 'marketing.pricing.starterTagline',
    monthlyUsd: 5,
    yearlyUsd: 50,
    dailyTokens: '50K',
    monthlyTokens: '750K',
    highlightKeys: [
      'marketing.pricing.starterHighlight1',
      'marketing.pricing.starterHighlight2',
      'marketing.pricing.starterHighlight3',
    ],
    isFeatured: false,
  },
  {
    slug: 'plus',
    nameKey: 'marketing.pricing.plusName',
    taglineKey: 'marketing.pricing.plusTagline',
    monthlyUsd: 10,
    yearlyUsd: 100,
    dailyTokens: '100K',
    monthlyTokens: '1.75M',
    highlightKeys: [
      'marketing.pricing.plusHighlight1',
      'marketing.pricing.plusHighlight2',
      'marketing.pricing.plusHighlight3',
    ],
    isFeatured: false,
  },
  {
    slug: 'pro',
    nameKey: 'marketing.pricing.proName',
    taglineKey: 'marketing.pricing.proTagline',
    monthlyUsd: 20,
    yearlyUsd: 200,
    dailyTokens: '250K',
    monthlyTokens: '4M',
    highlightKeys: [
      'marketing.pricing.proHighlight1',
      'marketing.pricing.proHighlight2',
      'marketing.pricing.proHighlight3',
    ],
    isFeatured: true,
  },
  {
    slug: 'team',
    nameKey: 'marketing.pricing.teamName',
    taglineKey: 'marketing.pricing.teamTagline',
    monthlyUsd: 50,
    yearlyUsd: 500,
    dailyTokens: '750K',
    monthlyTokens: '11M',
    highlightKeys: [
      'marketing.pricing.teamHighlight1',
      'marketing.pricing.teamHighlight2',
      'marketing.pricing.teamHighlight3',
    ],
    isFeatured: false,
  },
  {
    slug: 'scale',
    nameKey: 'marketing.pricing.scaleName',
    taglineKey: 'marketing.pricing.scaleTagline',
    monthlyUsd: 100,
    yearlyUsd: 1000,
    dailyTokens: '1.5M',
    monthlyTokens: '24M',
    highlightKeys: [
      'marketing.pricing.scaleHighlight1',
      'marketing.pricing.scaleHighlight2',
      'marketing.pricing.scaleHighlight3',
    ],
    isFeatured: false,
  },
  {
    slug: 'unlimited',
    nameKey: 'marketing.pricing.unlimitedName',
    taglineKey: 'marketing.pricing.unlimitedTagline',
    monthlyUsd: 200,
    yearlyUsd: 2000,
    dailyTokens: '5M',
    monthlyTokens: 'marketing.pricing.unlimitedMonthlyTokens',
    highlightKeys: [
      'marketing.pricing.unlimitedHighlight1',
      'marketing.pricing.unlimitedHighlight2',
      'marketing.pricing.unlimitedHighlight3',
    ],
    isFeatured: false,
  },
];

// Yearly billing is priced at ten months, so two are free.
export const MARKETING_YEARLY_FREE_MONTHS = 2;
