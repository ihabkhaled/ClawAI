import { CONNECTOR_PRESETS } from '@claw/shared-utilities';
import { ConnectorProvider } from '../../../../generated/prisma';
import { type ProviderAdapter } from '../provider-adapter.interface';
import { OpenAIAdapter } from './openai.adapter';
import { AnthropicAdapter } from './anthropic.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { BedrockAdapter } from './bedrock.adapter';
import { DeepSeekAdapter } from './deepseek.adapter';
import { GrokAdapter } from './grok.adapter';
import { OllamaAdapter } from './ollama.adapter';
import { LlamacppAdapter } from './llamacpp.adapter';
import { OpenAICompatibleAdapter } from './openai-compatible.adapter';

// Keyed by the provider STRING: the registry's keys are the shared-types enum
// and the connector row's are the Prisma enum — the same values, two nominal
// types. Every preset gets the one generic adapter (ADR-117).
const adapters = new Map<string, ProviderAdapter>([
  [ConnectorProvider.OPENAI, new OpenAIAdapter()],
  [ConnectorProvider.ANTHROPIC, new AnthropicAdapter()],
  [ConnectorProvider.GEMINI, new GeminiAdapter()],
  [ConnectorProvider.AWS_BEDROCK, new BedrockAdapter()],
  [ConnectorProvider.DEEPSEEK, new DeepSeekAdapter()],
  [ConnectorProvider.GROK, new GrokAdapter()],
  [ConnectorProvider.OLLAMA, new OllamaAdapter()],
  [ConnectorProvider.LLAMACPP, new LlamacppAdapter()],
  ...CONNECTOR_PRESETS.map((preset): [string, ProviderAdapter] => [
    preset.key,
    new OpenAICompatibleAdapter(preset),
  ]),
]);

export function getAdapter(provider: ConnectorProvider): ProviderAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`No adapter registered for provider: ${provider}`);
  }
  return adapter;
}
