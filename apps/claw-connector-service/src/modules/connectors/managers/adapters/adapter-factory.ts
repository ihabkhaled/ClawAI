import { ConnectorProvider } from '../../../../generated/prisma';
import { type ProviderAdapter } from '../provider-adapter.interface';
import { OpenAIAdapter } from './openai.adapter';
import { AnthropicAdapter } from './anthropic.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { BedrockAdapter } from './bedrock.adapter';
import { DeepSeekAdapter } from './deepseek.adapter';
import { GrokAdapter } from './grok.adapter';
import { OllamaAdapter } from './ollama.adapter';

const adapters = new Map<ConnectorProvider, ProviderAdapter>([
  [ConnectorProvider.OPENAI, new OpenAIAdapter()],
  [ConnectorProvider.ANTHROPIC, new AnthropicAdapter()],
  [ConnectorProvider.GEMINI, new GeminiAdapter()],
  [ConnectorProvider.AWS_BEDROCK, new BedrockAdapter()],
  [ConnectorProvider.DEEPSEEK, new DeepSeekAdapter()],
  [ConnectorProvider.GROK, new GrokAdapter()],
  [ConnectorProvider.OLLAMA, new OllamaAdapter()],
]);

export function getAdapter(provider: ConnectorProvider): ProviderAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`No adapter registered for provider: ${provider}`);
  }
  return adapter;
}
