/**
 * How to recognise an image-OUTPUT model offered under an ordinary chat
 * connector, and which `IMAGE_*` capability provider generates it.
 *
 * The connector catalog has no `IMAGE` model kind (`ModelKind` is
 * `CHAT | EMBEDDING | RERANKER | TOOL`), so the composer lists
 * `models/gemini-3-pro-image`, `grok-imagine-image` and `chatgpt-image-latest`
 * as ordinary CHAT models under GEMINI / GROK / OPENAI. Picking one sent it to
 * `/chat/completions`, which every provider refuses for an image model —
 * xAI answers `"grok-imagine-image is an image model and is therefore not
 * available on this endpoint"`; Gemini and OpenAI answer with a completion that
 * contains no picture.
 *
 * Shared by routing-service (so the routing decision — and the charge — names
 * the model the user picked) and chat-service (so the executed call reaches
 * image-service). Two copies drifted once: routing sent a manual
 * `grok-imagine-image` pick to Gemini (2026-09-25).
 *
 * Video models (`grok-imagine-video*`) are deliberately NOT matched: there is
 * no video-generation capability to redirect them to.
 */
export const IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR: ReadonlyMap<string, RegExp> = new Map([
  ['GEMINI', /^(models\/)?(gemini-[\w.-]*-image[\w.-]*|imagen-[\w.-]+)$/iu],
  ['GROK', /^grok-imagine-image[\w.-]*$/iu],
  ['OPENAI', /^(gpt-image[\w.-]*|dall-e-\d[\w.-]*|chatgpt-image[\w.-]*)$/iu],
]);

export const IMAGE_CAPABILITY_PROVIDER_BY_CONNECTOR: ReadonlyMap<string, string> = new Map([
  ['GEMINI', 'IMAGE_GEMINI'],
  ['GROK', 'IMAGE_GROK'],
  ['OPENAI', 'IMAGE_OPENAI'],
]);
