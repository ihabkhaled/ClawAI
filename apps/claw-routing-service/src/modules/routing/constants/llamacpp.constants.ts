/**
 * LLAMACPP runtime + LOCAL_FRONTIER role constants.
 *
 * Phase 9 of the Local Frontier LLM initiative.
 *
 * The routing pipeline considers LLAMACPP-resident frontier models as a candidate
 * BEFORE Ollama in privacy-sensitive paths and as a peer of Ollama in LOCAL_ONLY.
 *
 * Privacy-tagged prompts NEVER reach cloud when a frontier model is resident.
 */
export const LLAMACPP_RUNTIME = 'LLAMACPP' as const;
export const LOCAL_FRONTIER_ROLE = 'LOCAL_FRONTIER' as const;
export const LLAMACPP_HEALTH_POLL_INTERVAL_MS = 30_000;
export const LLAMACPP_HEALTH_TIMEOUT_MS = 3_000;
