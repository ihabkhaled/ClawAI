import type {
  MarketingModelFamily,
  MarketingNewestModel,
} from '@/types/subscription-marketing.types';

// Provider and model names are brand names and stay identical in every locale.
// The translated strength key supplies the human-readable positioning.
export const MARKETING_MODEL_FAMILIES: ReadonlyArray<MarketingModelFamily> = [
  {
    name: 'Anthropic Claude',
    models: ['Claude Fable 5', 'Claude Opus 5', 'Claude Sonnet 5', 'Claude Haiku 4.5'],
    strengthKey: 'marketing.models.anthropicStrength',
  },
  {
    name: 'OpenAI GPT',
    models: ['GPT-5.6 Sol', 'GPT-5.6 Terra', 'GPT-5.6 Luna', 'GPT-5.5'],
    strengthKey: 'marketing.models.openaiStrength',
  },
  {
    name: 'Google Gemini',
    models: [
      'Gemini 3.6 Flash',
      'Gemini 3.5 Flash',
      'Gemini 3.5 Flash-Lite',
      'Gemini 3.1 Pro Preview',
    ],
    strengthKey: 'marketing.models.geminiStrength',
  },
  {
    name: 'Moonshot Kimi',
    models: ['Kimi K3', 'Kimi K2.7 Code', 'Kimi K2.6'],
    strengthKey: 'marketing.models.kimiStrength',
  },
  {
    name: 'Zhipu GLM',
    models: ['GLM-5.2', 'GLM-5.1', 'GLM-5 Turbo', 'GLM-5'],
    strengthKey: 'marketing.models.glmStrength',
  },
  {
    name: 'Alibaba Qwen',
    models: ['Qwen3.7 Plus', 'Qwen3.6 Plus', 'Qwen3.5 Plus', 'Qwen3 Coder Next'],
    strengthKey: 'marketing.models.qwenStrength',
  },
  {
    name: 'DeepSeek',
    models: ['DeepSeek V4 Pro', 'DeepSeek V4 Flash'],
    strengthKey: 'marketing.models.deepseekStrength',
  },
  {
    name: 'xAI Grok',
    models: ['Grok 4.5', 'Grok 4.20', 'Grok 4.3'],
    strengthKey: 'marketing.models.grokStrength',
  },
  {
    name: 'Amazon Bedrock',
    models: ['Nova 2 Lite', 'GPT-5.6 Sol', 'Claude Opus 5', 'Grok 4.3'],
    strengthKey: 'marketing.models.bedrockStrength',
  },
];

export const MARKETING_NEWEST_MODELS: ReadonlyArray<MarketingNewestModel> = [
  { id: 'glm-5.2', label: 'GLM-5.2', provider: 'Zhipu' },
  { id: 'kimi-k3', label: 'Kimi K3', provider: 'Moonshot' },
  { id: 'qwen3.5', label: 'Qwen3.5', provider: 'Alibaba' },
  { id: 'minimax-m2.7', label: 'MiniMax M2.7', provider: 'MiniMax' },
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', provider: 'DeepSeek' },
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', provider: 'DeepSeek' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', provider: 'Google' },
  { id: 'nemotron-3-super', label: 'Nemotron 3 Super', provider: 'NVIDIA' },
];
