import { ModelUsageTier } from '../../../generated/prisma';
import { type ModelUsageMetadata } from '../types/connectors.types';

export interface OllamaCloudModelMetadata {
  contextTokens: number;
  usage: ModelUsageMetadata;
}

const NO_PUBLISHED_PRICE = {
  inputUsdPerMillion: null,
  cachedInputUsdPerMillion: null,
  outputUsdPerMillion: null,
} as const;

function metadata(tier: ModelUsageTier, contextTokens: number): OllamaCloudModelMetadata {
  return {
    contextTokens,
    usage: { tier, ...NO_PUBLISHED_PRICE },
  };
}

export const OLLAMA_CLOUD_MODEL_METADATA: Readonly<Record<string, OllamaCloudModelMetadata>> = {
  'glm-5.2': metadata(ModelUsageTier.HIGH, 976_000),
  'kimi-k3': {
    contextTokens: 1_000_000,
    usage: {
      tier: ModelUsageTier.UNKNOWN,
      inputUsdPerMillion: 3,
      cachedInputUsdPerMillion: 0.3,
      outputUsdPerMillion: 15,
    },
  },
  gemma4: metadata(ModelUsageTier.LOW, 256_000),
  'qwen3.5': metadata(ModelUsageTier.MEDIUM, 256_000),
  'glm-5.1': metadata(ModelUsageTier.HIGH, 198_000),
  'minimax-m2.7': metadata(ModelUsageTier.MEDIUM, 200_000),
  'nemotron-3-super': metadata(ModelUsageTier.MEDIUM, 256_000),
  'minimax-m2.5': metadata(ModelUsageTier.MEDIUM, 198_000),
  'minimax-m3': metadata(ModelUsageTier.HIGH, 512_000),
  'kimi-k2.7-code': metadata(ModelUsageTier.HIGH, 256_000),
  'kimi-k2.6': metadata(ModelUsageTier.HIGH, 256_000),
  'deepseek-v4-pro': metadata(ModelUsageTier.EXTRA_HIGH, 1_000_000),
  'deepseek-v4-flash': metadata(ModelUsageTier.MEDIUM, 1_000_000),
  'nemotron-3-ultra': metadata(ModelUsageTier.HIGH, 256_000),
  'gemini-3-flash-preview': metadata(ModelUsageTier.UNKNOWN, 1_000_000),
  'nemotron-3-nano': metadata(ModelUsageTier.LOW, 1_000_000),
  'kimi-k2.5': metadata(ModelUsageTier.HIGH, 256_000),
  'mistral-large-3': metadata(ModelUsageTier.MEDIUM, 256_000),
};

const GPT_OSS_20B = metadata(ModelUsageTier.LOW, 128_000);
const GPT_OSS_120B = metadata(ModelUsageTier.MEDIUM, 128_000);

export function resolveOllamaCloudModelMetadata(modelKey: string): OllamaCloudModelMetadata {
  const normalized = modelKey.trim().toLowerCase();
  if (normalized.startsWith('gpt-oss:20b')) {
    return GPT_OSS_20B;
  }
  if (normalized.startsWith('gpt-oss:120b')) {
    return GPT_OSS_120B;
  }
  const family = normalized.split(':')[0] ?? normalized;
  return OLLAMA_CLOUD_MODEL_METADATA[family] ?? metadata(ModelUsageTier.UNKNOWN, 0);
}
