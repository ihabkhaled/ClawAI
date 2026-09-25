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

// Bug-hunt 2026-05-31, Fix 4 — local Ollama on CPU cannot produce
// 31_500 tokens inside the 5-min HTTP timeout. Cap the *default* ctx
// assumption at 4_096 for the local-ollama provider so the computed
// default num_predict lands around ~3_500 — a reasonable upper bound
// for CPU 14B/27B models. Cloud + llamacpp keep the generous 32_768
// default (bandwidth + GPU sustain it). Explicit user / thread caps
// always win; this only affects the *defensive default* path.
export const OUTPUT_BOUNDS_LOCAL_OLLAMA_DEFAULT_CTX_SIZE = 4_096;

// Provider identifier for the local-Ollama runtime. Duplicated as a
// string literal here (not imported from execution.constants) so this
// constants file stays leaf-level and ESLint's no-restricted-syntax
// "no string-literal unions" rule doesn't sweep this single comparison.
const LOCAL_OLLAMA_PROVIDER_ID = 'local-ollama';

// Pick the default ctx-size baseline used by `computeDefaultMaxTokens`
// when no explicit cap is supplied. Local Ollama (CPU-bound, 5-min
// HTTP cap) gets a tight 4_096; every other provider (llamacpp on GPU,
// Ollama Cloud, OpenAI-compat cloud, Anthropic, Gemini, …) keeps the
// 32_768 baseline.
export const pickDefaultCtxSizeForProvider = (provider: string): number => {
  return provider === LOCAL_OLLAMA_PROVIDER_ID
    ? OUTPUT_BOUNDS_LOCAL_OLLAMA_DEFAULT_CTX_SIZE
    : OUTPUT_BOUNDS_DEFAULT_CTX_SIZE;
};

// Compute a defensive max-output-tokens default from the resident ctx
// size and an estimate of the prompt token count. Clamps to the floor
// when the prompt is already eating most of the context window.
export const computeDefaultMaxTokens = (ctxSize: number, promptTokens: number): number => {
  const available = ctxSize - promptTokens - OUTPUT_BOUNDS_SAFETY_MARGIN;
  return available < OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS ? OUTPUT_BOUNDS_MIN_OUTPUT_TOKENS : available;
};

// The default output budget for a HOSTED model when nobody asked for a length
// (2026-09-25). Before this, the ctx-derived default above sent ~32_768 minus
// the prompt — effectively "the model's maximum" — on every ordinary turn.
// That is harmless on the operator's own GPU but not on a metered provider:
// OpenRouter pre-authorizes `max_tokens × output price` against the key's
// remaining credit, so a key with $0.02 left refused a two-line question
// ("requested up to 31776 tokens, but can only afford 9063"), and every PAYG
// hold reserved ~31k output tokens of the user's credit for a reply that used
// a few hundred.
//
// Why 16_384 and not 4_096/8_192: reasoning models (GLM, DeepSeek-R, o-series)
// count thinking tokens against the same cap, and 8k cut thinking-heavy answers
// off before the answer began. 16k is ~12,000 words of visible output — no
// conversational reply gets near it — while halving the pre-authorization.
// Long-form paths are unaffected: an explicit thread `maxTokens`, the tool-loop
// / Runtime V2 caps and file generation (its own service) all set their own
// ceiling, bounded only by HARD_MAX_OUTPUT_TOKENS.
export const OUTPUT_BOUNDS_HOSTED_DEFAULT_MAX_OUTPUT_TOKENS = 16_384;

// Runtimes on the operator's own hardware. Their ctx-derived default stays: the
// resident --ctx-size is the real bound there and nothing is pre-authorized.
const LOCAL_RUNTIME_PROVIDER_IDS: readonly string[] = [
  LOCAL_OLLAMA_PROVIDER_ID,
  'local-llamacpp',
  'LLAMACPP',
];

// The default output cap for `provider` when neither the caller nor the thread
// set one: ctx-derived, and for a hosted provider never above the hosted default.
export const computeDefaultMaxTokensForProvider = (
  provider: string,
  promptTokens: number,
): number => {
  const fromContext = computeDefaultMaxTokens(
    pickDefaultCtxSizeForProvider(provider),
    promptTokens,
  );
  return LOCAL_RUNTIME_PROVIDER_IDS.includes(provider)
    ? fromContext
    : Math.min(fromContext, OUTPUT_BOUNDS_HOSTED_DEFAULT_MAX_OUTPUT_TOKENS);
};
