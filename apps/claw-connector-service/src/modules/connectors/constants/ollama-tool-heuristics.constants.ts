/**
 * Heuristics for detecting whether an Ollama model supports native tool calling.
 *
 * Ollama's `/api/tags` does not expose a per-tag `capabilities.tools` field, and
 * the Cloud catalog reaches ~250 models, so a live behavioral probe would mean
 * an inference call per model on every sync — unacceptable latency and token
 * cost. A curated family list is the right trade here, with a one-shot cached
 * probe on first *actual* tool use as the follow-up.
 *
 * Mirrors the structure of ollama-vision-heuristics.constants.ts deliberately:
 * the two capability heuristics should stay recognizably the same shape.
 *
 * Families that ship tool support: qwen3 (incl. qwen3-coder), gpt-oss,
 * deepseek, kimi, glm, mistral/mixtral, llama 3.1+ (3.0 and earlier do not),
 * command-r, firefunction, hermes, minimax.
 *
 * Families that largely do NOT: gemma (all generations), phi (except phi-4
 * variants that advertise it), moondream and the vision-only families,
 * embedding models.
 */
export const OLLAMA_TOOL_CAPABLE_MODEL_PATTERNS: readonly RegExp[] = [
  /^qwen3/i,
  /^qwen2\.5/i,
  /^gpt-oss/i,
  /^deepseek-v[34]/i,
  /^deepseek-r1/i,
  /^kimi-k[23]/i,
  /^glm-?[45]/i,
  /^minimax/i,
  /^mistral/i,
  /^mixtral/i,
  /^magistral/i,
  /^devstral/i,
  /^command-r/i,
  /^firefunction/i,
  /^hermes3/i,
  /^nemotron/i,
  /^llama3\.[1-9]/i,
  /^llama-?[4-9]/i,
  /^phi-?4/i,
];

/**
 * Families that must never be reported as tool-capable even if a broader
 * pattern above would otherwise match them. Checked first, so it wins.
 *
 * Embedding and vision-only models are the dangerous case: routing an agent run
 * onto one produces a run that cannot call anything and cannot say why.
 */
export const OLLAMA_TOOL_INCAPABLE_MODEL_PATTERNS: readonly RegExp[] = [
  /^gemma/i,
  /embed/i,
  /^nomic/i,
  /^moondream/i,
  /^llava/i,
  /^bakllava/i,
  /^minicpm-v/i,
  /-guard/i,
  /^shieldgemma/i,
];

export function isOllamaToolCapableModel(modelName: string): boolean {
  const lower = modelName.toLowerCase();
  if (OLLAMA_TOOL_INCAPABLE_MODEL_PATTERNS.some((pattern) => pattern.test(lower))) {
    return false;
  }
  return OLLAMA_TOOL_CAPABLE_MODEL_PATTERNS.some((pattern) => pattern.test(lower));
}
