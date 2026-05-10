import {
  CLOUD_PROVIDER_ANTHROPIC,
  CLOUD_PROVIDER_DEEPSEEK,
  CLOUD_PROVIDER_GEMINI,
  CLOUD_PROVIDER_GROK,
  CLOUD_PROVIDER_OPENAI,
  IMAGE_PROVIDER_GEMINI,
  IMAGE_PROVIDER_LOCAL,
  IMAGE_PROVIDER_OPENAI,
  LOCAL_PROVIDER,
} from './routing.constants';
import type { ProviderInferenceRule } from '../types/provider-inference.types';

/**
 * Ordered list of model-name → provider rules consumed by
 * `RoutingManager.inferProvider`. The list is evaluated top-to-bottom; the
 * first matching rule wins. Image-generation rules come first because their
 * substrings (e.g. "imagen") are unambiguous and we want them to win even
 * if a downstream rule (e.g. "gemini") would also match.
 */
export const PROVIDER_INFERENCE_RULES: readonly ProviderInferenceRule[] = [
  { provider: IMAGE_PROVIDER_OPENAI, includes: ['dall-e', 'dalle'] },
  { provider: IMAGE_PROVIDER_GEMINI, includes: ['imagen'] },
  { provider: IMAGE_PROVIDER_LOCAL, includes: ['sdxl', 'stable-diffusion', 'sd-turbo'] },
  { provider: CLOUD_PROVIDER_ANTHROPIC, startsWith: ['claude'], includes: ['anthropic'] },
  {
    provider: CLOUD_PROVIDER_OPENAI,
    startsWith: ['gpt', 'o1-', 'o3-', 'o4-'],
    includes: ['openai'],
  },
  { provider: CLOUD_PROVIDER_GEMINI, includes: ['gemini'] },
  { provider: CLOUD_PROVIDER_DEEPSEEK, includes: ['deepseek'] },
  { provider: CLOUD_PROVIDER_GROK, startsWith: ['grok'] },
  { provider: LOCAL_PROVIDER, includes: ['llama', 'mistral', 'phi', 'qwen'] },
];
