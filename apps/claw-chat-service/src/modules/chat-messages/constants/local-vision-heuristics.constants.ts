// Heuristics for detecting whether an installed local Ollama model supports
// vision (multimodal input). Mirrors
// `apps/claw-connector-service/src/modules/connectors/constants/
// ollama-vision-heuristics.constants.ts` — DRY violation is intentional for
// Slice B (see plan). The long-term fix is to source `supportsVision` from
// the connector-service ConnectorModel catalog over HTTP; the per-service
// fetch is deferred until the catalog exposes it for installed-models.
export const LOCAL_VISION_MODEL_PATTERNS: readonly RegExp[] = [
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

export function isLocalVisionModel(modelName: string): boolean {
  const lower = modelName.toLowerCase();
  return LOCAL_VISION_MODEL_PATTERNS.some((pattern) => pattern.test(lower));
}
