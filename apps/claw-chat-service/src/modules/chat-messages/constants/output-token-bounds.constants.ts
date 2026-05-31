// Output-token bounds used when the caller did not supply an explicit
// max_tokens / num_predict. The defensive default (Fix 3 of the Ollama
// truncation bug-hunt, 2026-05-31) computes a safe ceiling from
// `(ctxSize - promptTokensEstimate - SAFETY_MARGIN)` so the model is
// told how much output room it actually has. Without this, llama.cpp /
// Ollama silently hit their resident `--ctx-size` ceiling and emit
// `finish_reason: 'length'` mid-sentence with no telemetry.
//
// The MIN_OUTPUT_TOKENS floor here is intentionally larger (512) than the
// floor in `execution-fast-path.constants.ts` (24): the fast-path floor
// is for explicit user `maxTokens` overrides (the user asked for short),
// while this floor is for the *defensive default* path — even a tight
// prompt should be allowed at least ~512 tokens of breathing room so a
// substantive answer is not pre-truncated.
export const OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS = 512;

// Reserve a small headroom inside the ctx budget for the model's own
// stop / EOS tokens, sampler scratch, and our token-estimate jitter
// (CHAR_DIV_4 is approximate). 256 is the same margin llama.cpp's own
// `--n-predict` examples use.
export const OUTPUT_BOUNDS_SAFETY_MARGIN = 256;

// Default ctx size baseline. Matches the new `LLAMACPP_DEFAULT_CTX_SIZE`
// default (32_768) introduced alongside this fix — when the chat-service
// cannot query the resident model's actual ctx (cloud providers, no
// llamacpp-service round-trip), this is the safe assumption.
export const OUTPUT_BOUNDS_DEFAULT_CTX_SIZE = 32_768;

// Compute a defensive max-output-tokens default from the resident ctx
// size and an estimate of the prompt token count. Clamps to the floor
// when the prompt is already eating most of the context window.
export const computeDefaultMaxTokens = (
  ctxSize: number,
  promptTokens: number,
): number => {
  const available = ctxSize - promptTokens - OUTPUT_BOUNDS_SAFETY_MARGIN;
  if (available < OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS) {
    return OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS;
  }
  return available;
};
