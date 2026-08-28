// OpenAI's reasoning families changed two request fields, and both changes are
// hard errors rather than warnings:
//
//   * `max_tokens` is rejected outright — the field is `max_completion_tokens`.
//     ("Unsupported parameter: 'max_tokens' is not supported with this model.")
//   * `temperature` accepts only its default of 1. Any other value is a 400.
//     ("Unsupported value: 'temperature' does not support 0.7 with this model.")
//
// So a thread with a temperature set, or any request at all carrying a token
// cap, fails every turn on these models while the same thread answers normally
// on gpt-4o — which reads as an unreliable provider rather than two renamed
// fields.
//
// Matched by prefix rather than by an exhaustive list: OpenAI ships `gpt-5.6-sol`,
// `gpt-5.6-luna`, `gpt-5.5-pro` and friends faster than a list can be kept
// truthful, and every member of these families shares the constraint. The
// builder serves other OpenAI-compatible providers (DeepSeek, Grok, Anthropic's
// compat route) through the same code path, so this must stay narrow: those
// providers still take `max_tokens`, and a broad rule would break them.
export const OPENAI_REASONING_MODEL_PREFIXES: readonly string[] = ['gpt-5', 'o1', 'o3', 'o4'];
