import {
  ollamaArchitectureSchema,
  ollamaContextLengthSchema,
  ollamaShowResponseSchema,
} from '../dto/ollama-show.dto';
import { OLLAMA_CONTEXT_LENGTH_KEY_SUFFIX } from '../constants/ollama.constants';

/**
 * Reads a model's input window from an Ollama `/api/show` body.
 *
 * The architecture's own key (`<general.architecture>.context_length`) wins;
 * otherwise the largest positive `*.context_length` value is taken, because a
 * multimodal model may also carry a smaller encoder window under another arch
 * prefix. Anything malformed yields `undefined` — an unknown window, never a
 * guessed one.
 */
export function parseOllamaContextLength(body: unknown): number | undefined {
  const parsed = ollamaShowResponseSchema.safeParse(body);
  if (!parsed.success) {
    return undefined;
  }
  const info = parsed.data.model_info;

  const arch = ollamaArchitectureSchema.safeParse(info['general.architecture']);
  if (arch.success) {
    const own = ollamaContextLengthSchema.safeParse(
      info[`${arch.data}${OLLAMA_CONTEXT_LENGTH_KEY_SUFFIX}`],
    );
    if (own.success) {
      return own.data;
    }
  }

  let largest: number | undefined;
  for (const [key, value] of Object.entries(info)) {
    if (!key.endsWith(OLLAMA_CONTEXT_LENGTH_KEY_SUFFIX)) {
      continue;
    }
    const tokens = ollamaContextLengthSchema.safeParse(value);
    if (tokens.success && (largest === undefined || tokens.data > largest)) {
      largest = tokens.data;
    }
  }
  return largest;
}
