/**
 * Where a registry row's parameter count came from (ADR-234). Never stored:
 * it exists so the sync and the seed can log WHY a number was written, and so
 * a test can pin the precedence (a runtime's own report beats a table).
 */
export enum ParameterCountOrigin {
  /** A local runtime (Ollama, llama.cpp) reported it for the file it runs. */
  RUNTIME = 'RUNTIME',
  /** An entry of `PUBLISHED_PARAMETER_COUNT_RULES`, read from the maker's own page. */
  PUBLISHED_RULE = 'PUBLISHED_RULE',
  /** The maker's own model name states it (`qwen3-235b-a22b`). */
  MODEL_NAME = 'MODEL_NAME',
}
