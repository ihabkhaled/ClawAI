/**
 * Fallback planners, best first, used when the configured model is not on the
 * connector.
 *
 * Ordered by reasoning quality rather than size or speed: the planner runs once
 * per turn and only produces a small JSON object, so its latency barely shows
 * next to the answer it routes — but a bad routing decision is paid on every
 * token the chosen model then generates.
 */
export const ROUTER_MODEL_PREFERENCE_ORDER: readonly string[] = [
  'deepseek-v4-pro',
  'kimi-k3',
  'glm-5.2',
  'qwen3.5:397b',
  'gpt-oss:20b',
  'qwen3:1.7b',
];
