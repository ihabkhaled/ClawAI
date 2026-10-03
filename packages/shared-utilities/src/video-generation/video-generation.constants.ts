/**
 * How to recognise a video-OUTPUT model offered under an ordinary chat connector,
 * and which `VIDEO_*` capability provider generates it (ADR-137).
 *
 * The connector catalog has no VIDEO model kind, so `models/veo-3.1-*` and
 * `grok-imagine-video*` were listed as ordinary CHAT models and picking one ran
 * `/chat/completions`: Gemini answered 404 and xAI 400. OpenAI has no entry:
 * its Sora models and Videos API were shut down on 2026-09-24.
 */
export const VIDEO_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR: ReadonlyMap<string, RegExp> = new Map([
  ['GEMINI', /^(models\/)?veo-[\w.-]+$/iu],
  ['GROK', /^grok-imagine-video[\w.-]*$/iu],
]);

export const VIDEO_CAPABILITY_PROVIDER_BY_CONNECTOR: ReadonlyMap<string, string> = new Map([
  ['GEMINI', 'VIDEO_GEMINI'],
  ['GROK', 'VIDEO_GROK'],
]);

/** The connector that backs each `VIDEO_*` capability provider. */
export const VIDEO_PROVIDER_CONNECTORS: ReadonlyMap<string, string> = new Map([
  ['VIDEO_GEMINI', 'GEMINI'],
  ['VIDEO_GROK', 'GROK'],
]);

/**
 * The model AUTO uses per video provider, cheapest that still gives a usable clip.
 * Veo 3.1 Fast is $0.10/s, Grok Imagine Video $0.05/s (seed v11).
 */
export const VIDEO_AUTO_MODEL_BY_PROVIDER: ReadonlyMap<string, string> = new Map([
  ['VIDEO_GEMINI', 'veo-3.1-fast-generate-preview'],
  ['VIDEO_GROK', 'grok-imagine-video'],
]);

/** Order AUTO tries providers in; a failure falls through to the next. */
export const VIDEO_AUTO_PROVIDER_ORDER: readonly string[] = ['VIDEO_GEMINI', 'VIDEO_GROK'];

export const VIDEO_DURATION_SECONDS_MIN = 4;
export const VIDEO_DURATION_SECONDS_MAX = 8;
export const VIDEO_DURATION_SECONDS_DEFAULT = 4;
export const VIDEO_ASPECT_RATIOS = ['16:9', '9:16'] as const;
export const VIDEO_ASPECT_RATIO_DEFAULT = '16:9';

/**
 * A message that ASKS for a video: a making verb, then (optionally) small
 * words, then a video noun. Deliberately literal: "how do I make a video call",
 * "summarise this video" and "what is video generation" must not spend money.
 */
export const VIDEO_REQUEST_PATTERNS: readonly RegExp[] = [
  /\b(?:generate|create|make|produce|render|animate|imagine|film|shoot)\b\s+(?:me\s+|us\s+)?(?:(?:a|an|the|some|one|another|short|quick|small|new|cinematic|nice|cool|little|brief|\d+[- ]?(?:s|sec|secs|second|seconds))\s+)*(?:video|clip|animation|movie|film)\b(?!\s+(?:call|calls|conference|player|editor|editing|codec|format|file|files|game|games|streaming|meeting|chat|tutorial|course|url|link))/iu,
  /\btext[- ]to[- ]video\b/iu,
  // fr / es / de / ar: the same shape, a making verb then a video noun.
  /(?<![\p{L}\p{N}])(?:génère|genere|crée|cree|créer|fais|fabrique|produis)(?:[- ](?:moi|nous))?\s+(?:(?:une?|la|des|quelques?|courte?|petite?)\s+)*(?:vidéo|video|clip|animation)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:genera|crea|haz|produce|hazme)\s+(?:(?:un|una|el|la|algún|breve|corto|corta)\s+)*(?:vídeo|video|clip|animación)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:erstelle|generiere|mach|mache|produziere|erzeuge)\s+(?:mir\s+)?(?:(?:ein|einen|eine|kurzes|kurzen|das)\s+)*(?:video|videoclip|clip|animation)(?![\p{L}\p{N}])/iu,
  /(?:أنشئ|انشئ|اصنع|ولّد|ولد|اعمل|صمم|أنتج)\s+(?:لي\s+)?(?:\S+\s+){0,2}?(?:فيديو|مقطع|فديو)/u,
];

/**
 * Wording that asks for an ATTACHED image to be brought to life. Only read when an
 * image is attached (image-to-video): "animate this image" with nothing attached
 * has nothing to animate, so it is not a video request.
 */
export const VIDEO_ANIMATE_ATTACHED_IMAGE_PATTERNS: readonly RegExp[] = [
  /^\s*animate\b/iu,
  /\banimate\s+(?:this|that|these|the|my|it|him|her|them)\b/iu,
  /\b(?:bring|turn|make)\s+(?:this|that|the|my|it)\b[^.?!]{0,40}?\b(?:to\s+life|into\s+(?:a\s+)?(?:video|clip|animation|movie))\b/iu,
  /\b(?:image|photo|picture|pic)[- ]to[- ]video\b/iu,
];
