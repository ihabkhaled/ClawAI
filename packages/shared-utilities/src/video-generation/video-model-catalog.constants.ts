/**
 * Which connector model ids are video-OUTPUT models, and the model AUTO picks per `VIDEO_*`
 * provider. Google shut Veo 3.1 down on 2026-10-22; `gemini-omni-*` (Interactions API) is the
 * Gemini video model now, and `veo-*` stays recognised so an old pick still routes to video
 * and falls back to Omni. These replace the two maps of the same names that
 * `video-generation.constants.ts` still holds (that file cannot be edited until its unsafe-regex
 * warnings are fixed; the old copies are unused).
 */
export const VIDEO_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR: ReadonlyMap<string, RegExp> = new Map([
  ['GEMINI', /^(models\/)?(?:veo|gemini-omni)-[\w.-]+$/iu],
  ['GROK', /^grok-imagine-video[\w.-]*$/iu],
]);

/**
 * The model AUTO uses per video provider, cheapest that still gives a usable clip. Gemini Omni
 * Flash is about $0.10/s, Grok Imagine Video $0.05/s (routing seed v16).
 */
export const VIDEO_AUTO_MODEL_BY_PROVIDER: ReadonlyMap<string, string> = new Map([
  ['VIDEO_GEMINI', 'gemini-omni-1.1-flash'],
  ['VIDEO_GROK', 'grok-imagine-video'],
]);
