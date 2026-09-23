import {
  IMAGE_CAPABILITY_PROVIDER_BY_CONNECTOR,
  IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR,
} from '../constants/image-generation-target.constants';

/**
 * The `IMAGE_*` capability provider a connector model id belongs to, or
 * `undefined` when it is an ordinary chat model.
 *
 * `IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR` documents why this exists: the
 * connector catalog has no model kind that marks these apart from a chat model,
 * so the only signal left is the model id itself.
 */
export function resolveImageCapabilityProvider(
  connectorProvider: string,
  model: string,
): string | undefined {
  const pattern = IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR.get(connectorProvider);
  return !pattern?.test(model)
    ? undefined
    : IMAGE_CAPABILITY_PROVIDER_BY_CONNECTOR.get(connectorProvider);
}
