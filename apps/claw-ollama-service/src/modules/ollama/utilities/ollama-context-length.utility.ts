import {
  OLLAMA_ARCHITECTURE_KEY,
  OLLAMA_CONTEXT_LENGTH_KEY_SUFFIX,
} from '../constants/ollama-show.constants';
import {
  ollamaArchitectureSchema,
  ollamaContextLengthSchema,
  ollamaShowResponseSchema,
} from '../dto/ollama-show.dto';

/**
 * Reads a model's input window from an Ollama `/api/show` body.
 *
 * The architecture's own key (`<general.architecture>.context_length`) wins;
 * otherwise the largest positive `*.context_length` value is taken, because a
 * multimodal model may also carry a smaller encoder window under another arch
 * prefix. Anything malformed or missing yields `undefined`: an unknown window,
 * never a guessed one.
 */
export function parseOllamaContextLength(body: unknown): number | undefined {
  const parsed = ollamaShowResponseSchema.safeParse(body);
  if (!parsed.success) {
    return undefined;
  }
  // A Map, so a key built from the response's own architecture name is a lookup, not a property access.
  const info = new Map(Object.entries(parsed.data.model_info));

  const arch = ollamaArchitectureSchema.safeParse(info.get(OLLAMA_ARCHITECTURE_KEY));
  if (arch.success) {
    const own = ollamaContextLengthSchema.safeParse(
      info.get(`${arch.data}${OLLAMA_CONTEXT_LENGTH_KEY_SUFFIX}`),
    );
    if (own.success) {
      return own.data;
    }
  }

  const windows = [...info.entries()]
    .filter(([key]) => key.endsWith(OLLAMA_CONTEXT_LENGTH_KEY_SUFFIX))
    .flatMap(([, value]) => {
      const tokens = ollamaContextLengthSchema.safeParse(value);
      return tokens.success ? [tokens.data] : [];
    });
  return windows.length === 0 ? undefined : Math.max(...windows);
}
