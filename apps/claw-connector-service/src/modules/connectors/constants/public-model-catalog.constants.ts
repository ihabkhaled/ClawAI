import { connectorPresetDisplayNames } from '@claw/shared-utilities';
import { ConnectorProvider } from '../../../generated/prisma';

/**
 * How each provider is named to the public.
 *
 * The enum member is a database value (`AWS_BEDROCK`), not a brand. Printing it
 * raw on a marketing page is the kind of detail that makes a product look
 * unfinished, and lowercasing it mechanically gets "Openai" and "Xai" wrong —
 * so the mapping is written out once, here, rather than derived.
 *
 * The bespoke providers are written out here. Every OpenAI-compatible preset
 * takes its name from the preset registry (ADR-117), whose own test proves each
 * non-bespoke enum value has one — so the table stays complete without the
 * names being typed twice. The service still falls back to the raw value.
 */
export const PUBLIC_PROVIDER_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  [ConnectorProvider.OPENAI]: 'OpenAI',
  [ConnectorProvider.ANTHROPIC]: 'Anthropic',
  [ConnectorProvider.GEMINI]: 'Google Gemini',
  [ConnectorProvider.AWS_BEDROCK]: 'Amazon Bedrock',
  [ConnectorProvider.DEEPSEEK]: 'DeepSeek',
  [ConnectorProvider.OLLAMA]: 'Ollama',
  [ConnectorProvider.GROK]: 'xAI Grok',
  [ConnectorProvider.LLAMACPP]: 'llama.cpp',
  ...connectorPresetDisplayNames(),
};

/**
 * The order providers are listed in on a public page.
 *
 * Deliberately fixed rather than alphabetical or by model count: model counts
 * move every time an admin syncs a connector, and a page whose sections
 * reshuffle between deploys is disorienting and bad for a stable anchor link.
 * Providers absent from this list still render, after the ones named here.
 */
export const PUBLIC_PROVIDER_ORDER: readonly ConnectorProvider[] = [
  ConnectorProvider.OPENAI,
  ConnectorProvider.ANTHROPIC,
  ConnectorProvider.GEMINI,
  ConnectorProvider.DEEPSEEK,
  ConnectorProvider.GROK,
  ConnectorProvider.AWS_BEDROCK,
  ConnectorProvider.OLLAMA,
  ConnectorProvider.LLAMACPP,
] as const;
