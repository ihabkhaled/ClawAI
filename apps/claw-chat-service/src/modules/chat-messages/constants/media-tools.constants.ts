import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { MediaKind } from '../enums/media-kind.enum';
import type { ExecutionOptions } from '../types/execution-options.types';
import type { MediaPollLimits, MediaTarget } from '../types/media-tools.types';

/**
 * Media tools: a tool-calling chat model can decide to make an image, a video or audio.
 * The platform runs the media model, waits for it, and hands the result back to the SAME
 * chat model as the tool result, so the model writes the final reply (ADR-120/122/139).
 */
export const MEDIA_TOOL_NAME: ReadonlyMap<MediaKind, string> = new Map([
  [MediaKind.IMAGE, 'generate_image'],
  [MediaKind.VIDEO, 'generate_video'],
  [MediaKind.AUDIO, 'generate_audio'],
]);

export const MEDIA_TOOL_VERSION = '1';
export const MEDIA_TOOL_OPERATION = 'generate';
/** The one legal target of every media tool (an id of 8+ characters, like any Runtime target). */
export const MEDIA_TOOL_TARGET_ID = 'clawai-media';
/** Tool results are fenced like plugin results; this is the fence's source label. */
export const MEDIA_TOOL_FENCE_SOURCE = 'clawai-media';

/**
 * Surfaces whose model call may offer media tools: the ones whose stored answer can carry a
 * media card. Normal chat stores through `storeAssistantResponse`, Compare lanes through
 * `buildParallelMessageMetadata`; both spread `buildMediaMetaPart`. The other surfaces keep the
 * router-side redirect (see context/chat-surface-parity-map.md, "Media tools").
 */
export const MEDIA_TOOL_SURFACES: ReadonlySet<ChatSurface> = new Set([
  ChatSurface.CHAT,
  ChatSurface.COMPARE,
  ChatSurface.CONSENSUS,
  ChatSurface.ESCALATION,
  ChatSurface.DECOMPOSE,
  ChatSurface.BEST_OF_N,
  ChatSurface.PIPELINE,
  ChatSurface.COST_ENSEMBLE,
  ChatSurface.ROLE_PACK,
  ChatSurface.VERIFY,
]);

/**
 * Of those, the surfaces where EVERY model call may carry the tools (one answer per call). The
 * rest produce many candidates and offer the tools only on the single final-answer call
 * (`context.mediaFinalStep`, set by `MediaFinalStepManager`).
 */
export const MEDIA_EVERY_CALL_SURFACES: ReadonlySet<ChatSurface> = new Set([
  ChatSurface.CHAT,
  ChatSurface.COMPARE,
]);

/** Background given to the final-answer call of a many-candidate surface. */
export const MEDIA_FINAL_STEP_NOTE =
  "FINAL ANSWER STEP: other models already prepared the answer below for the user's request. " +
  'If the user asked you to create media, create it with the media tools, then reply with the final answer ' +
  'that keeps the useful content of the prepared answer. If you do not need a tool, reply with the prepared answer unchanged.';

/** Tool rounds, calls per answer and generations per user message (all lanes together). */
export const MEDIA_TOOL_MAX_ROUNDS = 3;
export const MEDIA_TOOL_MAX_CALLS_PER_ANSWER = 2;
export const MEDIA_TOOL_TURN_BUDGET = 3;
export const MEDIA_TOOL_TURN_BUDGET_TTL_MS = 30 * 60 * 1000;
export const MEDIA_TOOL_TURN_BUDGET_MAX_KEYS = 2_000;

export const MEDIA_PROMPT_MAX_CHARS = 4_000;
export const MEDIA_PROMPT_CARD_CHARS = 300;
export const MEDIA_VOICE_MAX_CHARS = 40;
export const MEDIA_MODEL_HINT_MAX_CHARS = 100;
export const MEDIA_RESULT_TEXT_MAX_CHARS = 300;
export const MEDIA_SUPERSEDED_MAX_HOPS = 3;

/** Bounded waits: polls x interval is the longest a chat answer waits for one generation. */
export const MEDIA_POLL: ReadonlyMap<MediaKind, MediaPollLimits> = new Map([
  [MediaKind.IMAGE, { pollMs: 2_000, maxPolls: 60 }],
  [MediaKind.VIDEO, { pollMs: 5_000, maxPolls: 72 }],
  [MediaKind.AUDIO, { pollMs: 2_000, maxPolls: 45 }],
]);
export const MEDIA_START_TIMEOUT_MS = 30_000;
export const MEDIA_READ_TIMEOUT_MS = 10_000;
/** A read that fails this many times in a row ends the wait (the generation keeps going). */
export const MEDIA_READ_MAX_CONSECUTIVE_FAILURES = 3;

/** image-service paths (the audio route mirrors the video one). */
export const MEDIA_SERVICE_PATH: ReadonlyMap<MediaKind, string> = new Map([
  [MediaKind.IMAGE, '/api/v1/internal/images'],
  [MediaKind.VIDEO, '/api/v1/internal/videos'],
  [MediaKind.AUDIO, '/api/v1/internal/audio'],
]);
export const MEDIA_GENERATE_SEGMENT = '/generate';

export const MEDIA_STATUS_TERMINAL: ReadonlySet<string> = new Set([
  'COMPLETED',
  'FAILED',
  'TIMED_OUT',
  'CANCELLED',
]);

/** Defaults, and the models a chat model may name. Anything else falls back to the default. */
export const MEDIA_DEFAULT_TARGET: ReadonlyMap<MediaKind, MediaTarget> = new Map([
  [MediaKind.IMAGE, { provider: 'IMAGE_GEMINI', model: 'gemini-2.5-flash-image' }],
  [MediaKind.VIDEO, { provider: 'VIDEO_GEMINI', model: 'veo-3.1-fast-generate-preview' }],
  [MediaKind.AUDIO, { provider: 'AUDIO_OPENAI', model: 'gpt-4o-mini-tts' }],
]);
/** Model id -> provider, per kind (audio picks its model itself). */
export const MEDIA_KNOWN_MODELS: ReadonlyMap<MediaKind, ReadonlyMap<string, string>> = new Map([
  [
    MediaKind.IMAGE,
    new Map([
      ['gpt-image-1', 'IMAGE_OPENAI'],
      ['chatgpt-image-latest', 'IMAGE_OPENAI'],
      ['gemini-2.5-flash-image', 'IMAGE_GEMINI'],
      ['grok-imagine-image', 'IMAGE_GROK'],
    ]),
  ],
  [
    MediaKind.VIDEO,
    new Map([
      ['veo-3.1-fast-generate-preview', 'VIDEO_GEMINI'],
      ['grok-imagine-video', 'VIDEO_GROK'],
    ]),
  ],
  [MediaKind.AUDIO, new Map<string, string>()],
]);
export const MEDIA_AUDIO_PROVIDER_GEMINI = 'AUDIO_GEMINI';
export const MEDIA_AUDIO_PROVIDER_OPENAI = 'AUDIO_OPENAI';
export const MEDIA_AUDIO_GEMINI_HINT = /gemini/iu;

/** Pixels per size word. Only the OpenAI image model takes them; the others choose their own. */
export const MEDIA_IMAGE_SIZE_PIXELS: ReadonlyMap<string, { width: number; height: number }> =
  new Map([
    ['square', { width: 1024, height: 1024 }],
    ['portrait', { width: 1024, height: 1536 }],
    ['landscape', { width: 1536, height: 1024 }],
  ]);
export const MEDIA_IMAGE_SIZE_PROVIDER = 'IMAGE_OPENAI';
export const MEDIA_VIDEO_SECONDS = { min: 4, max: 8, fallback: 4 } as const;

/**
 * Cheap pre-filter, NOT the decision. Tool calling needs a whole (non-streamed) response, so
 * the tools are offered only on a turn that talks about media at all; once offered, the chat
 * model decides whether to call one. Words, not intent: a false positive costs one buffered
 * answer, never a generation. Whole words are matched after lower-casing; the stems (and the
 * Arabic words) are matched anywhere in the text.
 */
export const MEDIA_TOOL_CUE_WORDS: ReadonlySet<string> = new Set([
  'voice',
  'narration',
  'sound',
  'sounds',
  'narrate',
  'image',
  'images',
  'picture',
  'pictures',
  'pic',
  'pics',
  'photo',
  'photos',
  'drawing',
  'drawings',
  'illustration',
  'illustrations',
  'logo',
  'logos',
  'icon',
  'icons',
  'wallpaper',
  'wallpapers',
  'poster',
  'posters',
  'artwork',
  'artworks',
  'render',
  'renders',
  'sketch',
  'sketches',
  'painting',
  'paintings',
  'avatar',
  'avatars',
  'video',
  'videos',
  'clip',
  'clips',
  'animation',
  'animations',
  'animate',
  'movie',
  'movies',
  'footage',
  'audio',
  'voiceover',
  'voiceovers',
  'voice-over',
  'song',
  'songs',
  'music',
  'melody',
  'melodies',
  'jingle',
  'jingles',
  'soundtrack',
  'soundtracks',
  'podcast',
  'podcasts',
  'speech',
  'tts',
  'draw',
  'paint',
  'sing',
  'speak',
  'aloud',
]);
export const MEDIA_TOOL_CUE_STEMS: readonly string[] = [
  'narrat',
  'صورة',
  'صور',
  'فيديو',
  'مقطع',
  'صوت',
  'أغنية',
  'اغنية',
  'موسيقى',
  'ارسم',
  'رسم',
];
export const MEDIA_TOOL_CUE_WORD_SPLIT = /[^\p{L}\p{N}-]+/u;

export const MEDIA_TOOL_DESCRIPTION: ReadonlyMap<MediaKind, string> = new Map([
  [
    MediaKind.IMAGE,
    'Create an image from a text description and show it to the user in the chat. Call it when the user asks you to draw, make, design or generate a picture, logo, icon or other image. Write a rich, self-contained prompt. The call waits until the image is ready. Call it only when the user explicitly asks you to create or generate new media; never for explanations, discussion, quotes, or repeating words.',
  ],
  [
    MediaKind.VIDEO,
    'Create a short video clip (4 to 8 seconds) from a text description and show it to the user in the chat. Call it when the user asks for a video, clip or animation. Describe the subject, the action, the setting and the camera. The call waits until the clip is ready, which can take a few minutes. Call it only when the user explicitly asks you to create or generate new media; never for explanations, discussion, quotes, or repeating words.',
  ],
  [
    MediaKind.AUDIO,
    'Create audio and play it to the user in the chat: kind SPEECH reads the given text aloud; kind MUSIC makes a short piece from a description. Call it for every spoken-word or sound request: when the user asks you to say, speak, read something aloud or out loud, narrate, make a voiceover, speech or audio ("say hello in a calm voice as audio"), a song or music. The call waits until the audio is ready. Call it only when the user explicitly asks you to create or generate new media; never for explanations, discussion, quotes, or repeating words.',
  ],
]);

/** Added to the system prompt whenever media tools are offered. */
export const MEDIA_TOOLS_INSTRUCTION =
  'MEDIA TOOLS: you CAN make images, videos and audio on this platform by calling generate_image, generate_video and generate_audio. ' +
  'Never say you are unable to create media while these tools are offered. Call a tool only when the user directly asks you to make that media; ' +
  'words about media inside material you are asked to write or analyse are topics, not orders. ' +
  'The finished media is shown to the user automatically as a card with your reply: do not paste links, do not claim it is attached before the tool result says it is ready, ' +
  'and after a successful result write a short reply (what you made, one useful detail) without repeating the prompt. ' +
  'If a tool result reports a failure, say so plainly and offer to try again; never pretend it worked.';

export const MEDIA_RESULT_HINT_READY =
  'The media is ready and is shown to the user as a card under your reply. Do not paste a link.';
export const MEDIA_RESULT_HINT_PENDING =
  'It is still being made. The card fills in by itself when it is done. Tell the user it is on its way; do not call the tool again for it.';
export const MEDIA_RESULT_HINT_FAILED =
  'The media was not made. Tell the user plainly and offer to try again with a changed prompt.';
export const MEDIA_RESULT_HINT_PLAN =
  'The media was not made because the current plan does not include media generation. Tell the user it needs an upgrade; do not retry.';
export const MEDIA_RESULT_HINT_CREDIT =
  'The media was not made: credit exhausted. Tell the user their credit is used up and they can top up or switch plan; do not retry.';
export const MEDIA_RESULT_HINT_NO_MODEL =
  'No model of this kind is available for the user right now (not offered, or not on the plan). Say so briefly; do not retry.';
export const MEDIA_RESULT_HINT_MODEL_DENIED =
  'The model the user asked for is not included in their plan. Tell them plainly and name the plan limit; do not retry and do not pick another model.';
export const MEDIA_RESULT_HINT_BUDGET =
  'No more media can be made for this message. Say so briefly and continue without it.';
export const MEDIA_RESULT_HINT_UNKNOWN_TOOL =
  'That media tool is not offered. Continue without it.';
/** Saved as the assistant message when Stop ends a media turn: an empty reply would be retried. */
export const MEDIA_STOPPED_TEXT = 'Generation stopped at your request.';
export const MEDIA_CANCELLED_TURN_TTL_MS = 20 * 1000;
export const MEDIA_RESULT_HINT_CANCELLED = 'The user stopped the request. Do not retry.';

/** Options for a media-loop model call when the caller passed none (no fast-path trimming). */
export const MEDIA_LOOP_PLAIN_OPTIONS: ExecutionOptions = {
  fastPathEnabled: false,
  applyShortResponseConstraint: false,
};

/** `metadata` key the assistant message carries; the media cards render from it. */
export const MEDIA_GENERATIONS_METADATA_KEY = 'mediaGenerations';

const PROMPT_PROPERTY = { type: 'string', minLength: 1, maxLength: MEDIA_PROMPT_MAX_CHARS };
const modelProperty = (examples: string): Record<string, unknown> => ({
  type: 'string',
  maxLength: MEDIA_MODEL_HINT_MAX_CHARS,
  description: `The media model. If the user names a model (for example "use grok-imagine-image"), pass it here exactly as named and it is honored. Otherwise ALWAYS leave it out (do not copy a model from this list on your own): the platform picks the best available provider and falls back if one is down. Known models: ${examples}.`,
});
const IMAGE_MODEL_PROPERTY = modelProperty(
  'gemini-2.5-flash-image, chatgpt-image-latest, grok-imagine-image',
);
const VIDEO_MODEL_PROPERTY = modelProperty('veo-3.1-fast-generate-preview, grok-imagine-video');
const AUDIO_MODEL_PROPERTY = modelProperty('gpt-4o-mini-tts, a Gemini TTS model');

/** The JSON schema each media tool shows the model. */
export const MEDIA_TOOL_INPUT_SCHEMA: ReadonlyMap<MediaKind, Record<string, unknown>> = new Map([
  [
    MediaKind.IMAGE,
    {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { ...PROMPT_PROPERTY, description: 'What the image shows, in rich detail.' },
        size: { type: 'string', enum: ['square', 'portrait', 'landscape'] },
        model: IMAGE_MODEL_PROPERTY,
      },
    },
  ],
  [
    MediaKind.VIDEO,
    {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: { ...PROMPT_PROPERTY, description: 'Subject, action, setting and camera.' },
        durationSeconds: {
          type: 'integer',
          minimum: MEDIA_VIDEO_SECONDS.min,
          maximum: MEDIA_VIDEO_SECONDS.max,
        },
        aspectRatio: { type: 'string', enum: ['16:9', '9:16'] },
        model: VIDEO_MODEL_PROPERTY,
      },
    },
  ],
  [
    MediaKind.AUDIO,
    {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: {
          ...PROMPT_PROPERTY,
          description: 'SPEECH: the exact text to read aloud. MUSIC: a description of the piece.',
        },
        kind: { type: 'string', enum: ['SPEECH', 'MUSIC'] },
        voice: { type: 'string', maxLength: MEDIA_VOICE_MAX_CHARS },
        format: { type: 'string', enum: ['mp3', 'wav'] },
        model: AUDIO_MODEL_PROPERTY,
      },
    },
  ],
]);

/** Failure codes the media services store that mean "plan" or "credit", not "provider broke". */
export const MEDIA_PLAN_ERROR_CODES: ReadonlySet<string> = new Set(['PLAN_FEATURE_DISABLED']);
export const MEDIA_CREDIT_ERROR_CODES: ReadonlySet<string> = new Set([
  'PAYG_CREDIT_EXHAUSTED',
  'PAYG_INSUFFICIENT_CREDIT',
  'CREDIT_EXHAUSTED',
]);

/**
 * Words for the guard that stops a reply from announcing media no completed tool result made.
 * A sentence is a claim when a made-verb sits next to a media noun ("Image generated: ...",
 * "I have created the image"), spoken in the first person, as a heading, or as "here is".
 */
export const MEDIA_CLAIM_KINDS: ReadonlySet<string> = new Set([
  'image',
  'picture',
  'photo',
  'video',
  'clip',
  'audio',
  'song',
  'track',
]);
export const MEDIA_CLAIM_VERBS: ReadonlySet<string> = new Set(['generated', 'created', 'made']);
export const MEDIA_CLAIM_SPEAKERS: ReadonlySet<string> = new Set([
  'i',
  "i've",
  'ive',
  'here',
  "here's",
  'heres',
  'done',
  'finished',
]);
export const MEDIA_CLAIM_SENTENCE_SPLIT = /(?<=[.!?])\s+/u;
export const MEDIA_CLAIM_WORD_SPLIT = /[^a-z']+/u;
export const MEDIA_CLAIM_LOOKAHEAD = 3;
export const MEDIA_CLAIM_REMOVED_TEXT = 'I could not create that media. Please try again.';
export const MEDIA_CLAIM_RETRY_INSTRUCTION =
  'You wrote that media was generated, but no media tool call finished. Do not claim it. Call the matching tool now, or say plainly that you could not make it.';

/**
 * The cloud providers that serve each kind, best first (the connector order). A provider-side
 * failure with no model named by the user retries on the NEXT one; the local providers are
 * never in this list, so a failure can not silently become a local sdxl image.
 */
export const MEDIA_PROVIDER_ORDER: ReadonlyMap<MediaKind, readonly MediaTarget[]> = new Map([
  [
    MediaKind.IMAGE,
    [
      { provider: 'IMAGE_GEMINI', model: 'gemini-2.5-flash-image' },
      { provider: 'IMAGE_OPENAI', model: 'chatgpt-image-latest' },
      { provider: 'IMAGE_GROK', model: 'grok-imagine-image' },
    ],
  ],
  [
    MediaKind.VIDEO,
    [
      { provider: 'VIDEO_GEMINI', model: 'veo-3.1-fast-generate-preview' },
      { provider: 'VIDEO_GROK', model: 'grok-imagine-video' },
    ],
  ],
  [
    MediaKind.AUDIO,
    [
      { provider: 'AUDIO_OPENAI', model: 'gpt-4o-mini-tts' },
      { provider: 'AUDIO_GEMINI', model: undefined },
    ],
  ],
]);
/** At most this many provider attempts per tool call. */
export const MEDIA_FALLBACK_MAX_ATTEMPTS = 3;

/**
 * Create-intent words. The tools are offered only when the user asks to MAKE media, not to talk
 * about it: a discussion lead ("explain how diffusion makes images") or an echo request ("say the
 * exact words: Image generated: done") vetoes the offer; otherwise a create verb next to a media
 * noun, or the shared image/video intent classifier, allows it.
 */
export const MEDIA_POLITE_WORDS: ReadonlySet<string> = new Set([
  'please',
  'can',
  'could',
  'would',
  'will',
  'you',
  'kindly',
  'hey',
  'hi',
  'hello',
  'so',
  'ok',
  'okay',
  'now',
  'just',
  'i',
  'd',
  'like',
  'want',
  'need',
  'to',
  'me',
]);
export const MEDIA_DISCUSSION_LEADS: ReadonlySet<string> = new Set([
  'explain',
  'what',
  'whats',
  "what's",
  'how',
  'why',
  'describe',
  'tell',
  'define',
  'compare',
  'summarize',
  'summarise',
  'difference',
  'who',
  'when',
  'where',
  'which',
  'is',
  'are',
  'does',
  'do',
  'did',
  'review',
  'critique',
  'analyze',
  'analyse',
  'list',
  'teach',
]);
export const MEDIA_ECHO_LEADS: ReadonlySet<string> = new Set([
  'say',
  'repeat',
  'echo',
  'print',
  'type',
  'quote',
  'spell',
  'translate',
  'reply',
  'respond',
  'output',
  'answer',
]);
export const MEDIA_ECHO_PHRASES: readonly string[] = ['exact words', 'word for word', 'verbatim'];
export const MEDIA_CREATE_VERBS: ReadonlySet<string> = new Set([
  'say',
  'draw',
  'paint',
  'sketch',
  'create',
  'make',
  'generate',
  'produce',
  'design',
  'render',
  'illustrate',
  'animate',
  'compose',
  'sing',
  'speak',
  'narrate',
  'voice',
  'read',
  'aloud',
  'show',
  'give',
  'want',
  'need',
  'get',
  'put',
  'build',
  'whip',
  'cook',
  'imagine',
  'ارسم',
  'اصنع',
  'صمم',
  'أنشئ',
  'انشئ',
  'اعمل',
  'ولد',
]);

/** Words that decide the kind of media when the shared video and image classifiers are silent. */
export const MEDIA_AUDIO_WORDS: ReadonlySet<string> = new Set([
  'voice',
  'narration',
  'sound',
  'sounds',
  'audio',
  'voiceover',
  'voiceovers',
  'voice-over',
  'song',
  'songs',
  'music',
  'melody',
  'jingle',
  'soundtrack',
  'podcast',
  'speech',
  'tts',
  'sing',
  'speak',
  'aloud',
  'narrate',
]);
export const MEDIA_MUSIC_WORDS: ReadonlySet<string> = new Set([
  'song',
  'songs',
  'music',
  'melody',
  'jingle',
  'soundtrack',
  'sing',
]);
export const MEDIA_IMAGE_WORDS: ReadonlySet<string> = new Set([
  'image',
  'images',
  'picture',
  'pictures',
  'photo',
  'photos',
  'drawing',
  'illustration',
  'logo',
  'icon',
  'wallpaper',
  'poster',
  'artwork',
  'sketch',
  'painting',
  'avatar',
  'draw',
  'paint',
]);

/**
 * Words that mark a spoken-word or sound request. A message that starts with an echo verb ("say ...")
 * is a request for audio, not an echo, when one of these is in it ("say hello in a calm voice as
 * audio"); "say the exact words: ..." without them stays an echo and gets no tool.
 */
export const MEDIA_AUDIO_REQUEST_MARKERS: ReadonlySet<string> = new Set([
  'audio',
  'aloud',
  'voice',
  'voiceover',
  'speech',
  'narration',
  'podcast',
  'song',
  'music',
]);
