import { FILE_GENERATION_PROVIDER, IMAGE_PROVIDER_PREFIX } from '../execution.constants';

/**
 * Pins the shape the execution exposure gate relies on.
 *
 * `assertExposedForExecution` asks connector-service whether a model is
 * exposed. Connector-service only knows CONNECTOR providers — GEMINI, OPENAI —
 * keyed the way its catalog stores them (`models/gemini-2.5-flash-image`).
 *
 * Image and file-generation providers are neither: `IMAGE_GEMINI` is not a
 * connector provider and `gemini-2.5-flash-image` is not a catalog key, so the
 * gate answered "not exposed" every single time and image generation from chat
 * was refused before the image service was ever called. The gate now skips
 * these providers, which are gated by their own service and the PAYG
 * reservation instead.
 *
 * If these identifiers drift, that skip silently stops matching and image
 * generation breaks again in exactly the same way.
 */
describe('image provider identification for the exposure gate', () => {
  it('marks every image pseudo-provider with the prefix the gate skips on', () => {
    for (const provider of ['IMAGE_GEMINI', 'IMAGE_OPENAI', 'IMAGE_LOCAL', 'IMAGE_LOCAL_COMFYUI']) {
      expect(provider.startsWith(IMAGE_PROVIDER_PREFIX)).toBe(true);
    }
  });

  it('does not let a real connector provider match that prefix', () => {
    // The skip must never widen to a text model: those genuinely need the gate.
    for (const provider of ['GEMINI', 'OPENAI', 'ANTHROPIC', 'OLLAMA', 'GROK', 'DEEPSEEK']) {
      expect(provider.startsWith(IMAGE_PROVIDER_PREFIX)).toBe(false);
      expect(provider).not.toBe(FILE_GENERATION_PROVIDER);
    }
  });

  it('keeps the file-generation provider distinct from the image prefix', () => {
    expect(FILE_GENERATION_PROVIDER.startsWith(IMAGE_PROVIDER_PREFIX)).toBe(false);
  });
});
