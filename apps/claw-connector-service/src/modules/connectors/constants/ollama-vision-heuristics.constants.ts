/**
 * Heuristics for detecting whether an Ollama model supports vision (multimodal input).
 *
 * Ollama's `/api/tags` endpoint does not expose a `capabilities.vision` field on each
 * tag, so we fall back to a name-based heuristic that matches the well-known
 * multimodal model families.
 */
export const OLLAMA_MULTIMODAL_MODEL_PATTERNS: readonly RegExp[] = [
  /^llava/i,
  /^bakllava/i,
  /^moondream/i,
  /^minicpm-v/i,
  /^minicpm/i,
  /^cogvlm/i,
  /^llama3\.2-vision/i,
  /^llama-?3\.2-?vision/i,
  /vision/i,
  /multimodal/i,
];

export function isOllamaMultimodalModel(modelName: string): boolean {
  const lower = modelName.toLowerCase();
  return OLLAMA_MULTIMODAL_MODEL_PATTERNS.some((pattern) => pattern.test(lower));
}
