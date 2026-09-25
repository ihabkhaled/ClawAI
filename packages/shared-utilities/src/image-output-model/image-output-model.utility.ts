import {
  IMAGE_CAPABILITY_PROVIDER_BY_CONNECTOR,
  IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR,
} from './image-output-model.constants';

/**
 * The `IMAGE_*` capability provider a connector model id belongs to, or
 * `undefined` when it is an ordinary chat model (or the connector has no
 * image-output models).
 *
 * `IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR` documents why this exists: the
 * connector catalog has no model kind that marks these apart from a chat model,
 * so the only signal left is the model id itself.
 */
export function resolveImageCapabilityProvider(
  connectorProvider: string,
  model: string,
): string | undefined {
  const connector = connectorProvider.trim().toUpperCase();
  const pattern = IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR.get(connector);
  return pattern?.test(model.trim()) === true
    ? IMAGE_CAPABILITY_PROVIDER_BY_CONNECTOR.get(connector)
    : undefined;
}

/**
 * The `IMAGE_*` capability provider for a bare model id when the connector is
 * unknown — the first connector whose image-output pattern matches it.
 */
export function inferImageCapabilityProvider(model: string): string | undefined {
  for (const connector of IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR.keys()) {
    const provider = resolveImageCapabilityProvider(connector, model);
    if (provider !== undefined) return provider;
  }
  return undefined;
}
