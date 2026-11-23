import {
  LiveCaptureError,
  LiveCaptureSource,
  LiveCaptureState,
  LiveExportFormat,
  LiveFeedEventKind,
  LiveHighlightType,
  LiveMode,
  LivePlatform,
  LivePolicyNumberField,
  LiveSessionState,
  LiveStatusCode,
  LiveStatusTone,
} from '@/enums/live.enum';
import type {
  LiveCaptureCopy,
  LiveCaptureMachine,
  LiveDisplayMediaOptions,
  LiveEmbedView,
  LiveExportOption,
  LiveFeedState,
  LiveModeOption,
  LivePlaybackSnapshot,
  LivePolicyNumberFieldOption,
  LiveStatusPresentation,
} from '@/types/live.types';

/** Every path the live-service exposes to the browser (architecture doc section 9). */
export const LIVE_API = {
  RESOLVE: '/live/sources/resolve',
  SESSIONS: '/live/sessions',
  SESSION: (id: string): string => `/live/sessions/${id}`,
  HEARTBEAT: (id: string): string => `/live/sessions/${id}/heartbeat`,
  APPROVE_CREDITS: (id: string): string => `/live/sessions/${id}/approve-credits`,
  STREAM: (id: string): string => `/live/sessions/${id}/stream`,
  CLOSE_BEACON: (id: string): string => `/live/sessions/${id}/close`,
  AUDIO: (id: string): string => `/live/sessions/${id}/audio`,
  HLS_PLAYLIST: (streamId: string): string => `/live/streams/${streamId}/hls/index.m3u8`,
  HISTORY: '/live/history',
  HISTORY_ITEM: (id: string): string => `/live/history/${id}`,
  HISTORY_EVENTS: (id: string): string => `/live/history/${id}/events`,
  HISTORY_EXPORT: (id: string): string => `/live/history/${id}/export`,
  EVENT_VERSIONS: (id: string): string => `/live/events/${id}/versions`,
  EVENT_ENHANCE: (id: string): string => `/live/events/${id}/enhance`,
  USAGE: '/live/usage',
  ADMIN_OVERVIEW: '/live/admin/overview',
  ADMIN_STOP_RUN: (id: string): string => `/live/admin/runs/${id}/stop`,
  ADMIN_POLICY: '/live/admin/policy',
  ADMIN_POLICY_ROLLBACK: '/live/admin/policy/rollback',
} as const;

/** Heartbeat cadence; the server detaches a viewer after 30 s of silence. */
export const LIVE_HEARTBEAT_INTERVAL_MS = 10_000;

/** Fallback live latency when the player cannot report one (about three HLS target durations). */
export const LIVE_DEFAULT_LATENCY_MS = 15_000;

/** Behind the live edge by more than this shows "Jump to live". */
export const LIVE_BEHIND_THRESHOLD_MS = 20_000;

/** The feed only auto-scrolls when the reader is this close to the bottom. */
export const LIVE_AUTO_SCROLL_THRESHOLD_PX = 48;

/** Captions kept in memory for one modal; older ones live in history. */
export const LIVE_MAX_CAPTIONS = 400;

export const LIVE_HLS_MIME_TYPE = 'application/vnd.apple.mpegurl';

export const LIVE_JSON_MIME_TYPE = 'application/json';

export const LIVE_SSE_OPTIONS = { jitterRatio: 0.3, resetAttemptsAfterLive: true } as const;

export const LIVE_SECONDS_PER_MINUTE = 60;

export const LIVE_MS_PER_SECOND = 1000;

export const LIVE_PERCENT = 100;

export const LIVE_ADMIN_DAYS_OPTIONS: ReadonlyArray<number> = [1, 7, 30];

export const LIVE_ADMIN_DEFAULT_DAYS = 7;

export const LIVE_EXPORT_FILENAME_PREFIX = 'clawai-live';

export const LIVE_MODE_OPTIONS: ReadonlyArray<LiveModeOption> = [
  { mode: LiveMode.AUDIO, labelKey: 'live.page.modeAudio' },
  { mode: LiveMode.AUDIO_VISION, labelKey: 'live.page.modeAudioVision' },
  { mode: LiveMode.SMART_AUTO, labelKey: 'live.page.modeSmartAuto' },
];

export const LIVE_EXPORT_OPTIONS: ReadonlyArray<LiveExportOption> = [
  { format: LiveExportFormat.PDF, labelKey: 'live.history.exportPdf', extension: 'pdf' },
  { format: LiveExportFormat.MARKDOWN, labelKey: 'live.history.exportMarkdown', extension: 'md' },
  { format: LiveExportFormat.TXT, labelKey: 'live.history.exportTxt', extension: 'txt' },
];

export const LIVE_STATUS_PRESENTATION: Record<LiveStatusCode, LiveStatusPresentation> = {
  [LiveStatusCode.CONNECTING]: {
    titleKey: 'live.status.connectingTitle',
    descriptionKey: 'live.status.connectingDescription',
    tone: LiveStatusTone.INFO,
  },
  [LiveStatusCode.ANALYZING]: {
    titleKey: 'live.status.analyzingTitle',
    descriptionKey: 'live.status.analyzingDescription',
    tone: LiveStatusTone.INFO,
  },
  [LiveStatusCode.PAUSED]: {
    titleKey: 'live.status.pausedTitle',
    descriptionKey: 'live.status.pausedDescription',
    tone: LiveStatusTone.NEUTRAL,
  },
  [LiveStatusCode.DELAYED]: {
    titleKey: 'live.status.delayedTitle',
    descriptionKey: 'live.status.delayedDescription',
    tone: LiveStatusTone.WARNING,
  },
  [LiveStatusCode.RECOVERING]: {
    titleKey: 'live.status.recoveringTitle',
    descriptionKey: 'live.status.recoveringDescription',
    tone: LiveStatusTone.WARNING,
  },
  [LiveStatusCode.FREE_EXHAUSTED]: {
    titleKey: 'live.status.freeExhaustedTitle',
    descriptionKey: 'live.status.freeExhaustedDescription',
    tone: LiveStatusTone.WARNING,
  },
  [LiveStatusCode.CREDITS_REQUIRED]: {
    titleKey: 'live.status.creditsRequiredTitle',
    descriptionKey: 'live.status.creditsRequiredDescription',
    tone: LiveStatusTone.WARNING,
  },
  [LiveStatusCode.GRACE]: {
    titleKey: 'live.status.graceTitle',
    descriptionKey: 'live.status.graceDescription',
    tone: LiveStatusTone.WARNING,
  },
  [LiveStatusCode.EXHAUSTED]: {
    titleKey: 'live.status.exhaustedTitle',
    descriptionKey: 'live.status.exhaustedDescription',
    tone: LiveStatusTone.DANGER,
  },
  [LiveStatusCode.UNSUPPORTED]: {
    titleKey: 'live.status.unsupportedTitle',
    descriptionKey: 'live.status.unsupportedDescription',
    tone: LiveStatusTone.NEUTRAL,
  },
  [LiveStatusCode.CAPACITY]: {
    titleKey: 'live.status.capacityTitle',
    descriptionKey: 'live.status.capacityDescription',
    tone: LiveStatusTone.DANGER,
  },
  [LiveStatusCode.ENDED]: {
    titleKey: 'live.status.endedTitle',
    descriptionKey: 'live.status.endedDescription',
    tone: LiveStatusTone.NEUTRAL,
  },
  [LiveStatusCode.COMPLETED]: {
    titleKey: 'live.status.completedTitle',
    descriptionKey: 'live.status.completedDescription',
    tone: LiveStatusTone.NEUTRAL,
  },
};

/** Token classes per tone; text stays `foreground`, so contrast is the theme's own (>= 4.5:1). */
export const LIVE_STATUS_TONE_CLASSES: Record<LiveStatusTone, string> = {
  [LiveStatusTone.INFO]: 'border-border bg-muted text-foreground',
  [LiveStatusTone.WARNING]: 'border-warning bg-warning/10 text-foreground',
  [LiveStatusTone.DANGER]: 'border-destructive bg-destructive/10 text-foreground',
  [LiveStatusTone.NEUTRAL]: 'border-border bg-card text-foreground',
};

/** The status a session state starts the banner at (create returns a state, not a status code). */
export const LIVE_SESSION_STATE_STATUS: Record<LiveSessionState, LiveStatusCode> = {
  [LiveSessionState.CONNECTING]: LiveStatusCode.CONNECTING,
  [LiveSessionState.ACTIVE]: LiveStatusCode.ANALYZING,
  [LiveSessionState.PAUSED]: LiveStatusCode.PAUSED,
  [LiveSessionState.CREDITS_REQUIRED]: LiveStatusCode.CREDITS_REQUIRED,
  [LiveSessionState.GRACE]: LiveStatusCode.GRACE,
  [LiveSessionState.EXHAUSTED]: LiveStatusCode.EXHAUSTED,
  [LiveSessionState.UNSUPPORTED]: LiveStatusCode.UNSUPPORTED,
  [LiveSessionState.DETACHED]: LiveStatusCode.COMPLETED,
};

/** Statuses that ask the viewer to approve paid minutes. */
export const LIVE_CREDIT_STATUSES: ReadonlySet<LiveStatusCode> = new Set([
  LiveStatusCode.CREDITS_REQUIRED,
  LiveStatusCode.FREE_EXHAUSTED,
]);

/** Server statuses that win over the local "paused" state. */
export const LIVE_SERVER_DOMINANT_STATUSES: ReadonlySet<LiveStatusCode> = new Set([
  LiveStatusCode.FREE_EXHAUSTED,
  LiveStatusCode.CREDITS_REQUIRED,
  LiveStatusCode.GRACE,
  LiveStatusCode.EXHAUSTED,
  LiveStatusCode.UNSUPPORTED,
  LiveStatusCode.CAPACITY,
  LiveStatusCode.ENDED,
  LiveStatusCode.COMPLETED,
]);

/** After one of these the stream produces nothing new, so the SSE stops reconnecting. */
export const LIVE_TERMINAL_STATUSES: ReadonlySet<LiveStatusCode> = new Set([
  LiveStatusCode.ENDED,
  LiveStatusCode.COMPLETED,
  LiveStatusCode.UNSUPPORTED,
]);

export const LIVE_HIGHLIGHT_TYPE_KEYS: Record<LiveHighlightType, string> = {
  [LiveHighlightType.DECISION]: 'live.highlight.decision',
  [LiveHighlightType.ANNOUNCEMENT]: 'live.highlight.announcement',
  [LiveHighlightType.DEMONSTRATION]: 'live.highlight.demonstration',
  [LiveHighlightType.KEY_STATEMENT]: 'live.highlight.keyStatement',
  [LiveHighlightType.QUESTION]: 'live.highlight.question',
  [LiveHighlightType.MILESTONE]: 'live.highlight.milestone',
  [LiveHighlightType.OTHER]: 'live.highlight.other',
};

export const LIVE_FEED_KIND_KEYS: Record<LiveFeedEventKind, string> = {
  [LiveFeedEventKind.SUMMARY]: 'live.card.kindSummary',
  [LiveFeedEventKind.HIGHLIGHT]: 'live.card.kindHighlight',
  [LiveFeedEventKind.VISUAL]: 'live.card.kindVisual',
  [LiveFeedEventKind.GAP]: 'live.card.kindGap',
  [LiveFeedEventKind.FINAL]: 'live.card.kindFinal',
};

export const LIVE_EMPTY_FEED_STATE: LiveFeedState = {
  captions: [],
  captionTranslations: {},
  cards: [],
  highlights: [],
  status: LiveStatusCode.CONNECTING,
  usage: null,
};

/** Before the video has a frame: nothing is revealed (no event has startAt <= 0). */
export const LIVE_EMPTY_PLAYBACK: LivePlaybackSnapshot = {
  playbackAt: 0,
  isPaused: true,
  seekable: null,
  liveEdgeAt: null,
};

/** The numeric fields of the admin policy form, in display order. */
export const LIVE_POLICY_NUMBER_FIELDS: ReadonlyArray<LivePolicyNumberFieldOption> = [
  { field: LivePolicyNumberField.GRACE_SECONDS, labelKey: 'live.admin.graceSeconds' },
  { field: LivePolicyNumberField.MAX_ACTIVE_STREAMS, labelKey: 'live.admin.maxActiveStreams' },
  { field: LivePolicyNumberField.MAX_SESSIONS_PER_USER, labelKey: 'live.admin.maxSessionsPerUser' },
  {
    field: LivePolicyNumberField.SESSIONS_PER_USER_PER_HOUR,
    labelKey: 'live.admin.sessionsPerUserPerHour',
  },
  { field: LivePolicyNumberField.DAILY_BUDGET_USD, labelKey: 'live.admin.dailyBudget' },
  {
    field: LivePolicyNumberField.BUDGET_SOFT_STOP_PERCENT,
    labelKey: 'live.admin.budgetSoftStopPercent',
  },
];

/** live-service refuses YouTube @handle links with this code (paste the video or /channel/UC… link). */
export const LIVE_YOUTUBE_HANDLE_ERROR_CODE = 'LIVE_YOUTUBE_HANDLE_UNSUPPORTED';

/** Where "Watch on YouTube" points; the embed URL carries the video or channel id. */
export const LIVE_YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v=';
export const LIVE_YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/channel/';
export const LIVE_YOUTUBE_CHANNEL_EMBED_SEGMENT = 'live_stream';

/** live-service refuses Discord links with this code (Go Live streams have no public link). */
export const LIVE_DISCORD_PRIVATE_ERROR_CODE = 'LIVE_DISCORD_PRIVATE';

/** Platform names are brands: shown as is in every language. */
export const LIVE_PLATFORM_NAMES: Record<LivePlatform, string> = {
  [LivePlatform.YOUTUBE]: 'YouTube',
  [LivePlatform.TWITCH]: 'Twitch',
  [LivePlatform.KICK]: 'Kick',
  [LivePlatform.FACEBOOK]: 'Facebook',
  [LivePlatform.TIKTOK]: 'TikTok',
  [LivePlatform.INSTAGRAM]: 'Instagram',
  [LivePlatform.RUMBLE]: 'Rumble',
  [LivePlatform.BIGO]: 'BIGO LIVE',
  [LivePlatform.LINKEDIN]: 'LinkedIn',
  [LivePlatform.DISCORD]: 'Discord',
  [LivePlatform.TELEGRAM]: 'Telegram',
  [LivePlatform.BILIBILI]: 'Bilibili',
  [LivePlatform.CHZZK]: 'CHZZK',
  [LivePlatform.SOOP]: 'SOOP',
  [LivePlatform.NIMO]: 'Nimo TV',
};

// ─── Browser tab-audio capture (batch 2) ─────────────────────────────────────

/** Same-origin AudioWorklet module (public/worklets), registered under this processor name. */
export const LIVE_CAPTURE_WORKLET_URL = '/worklets/live-capture-processor.js';
export const LIVE_CAPTURE_PROCESSOR_NAME = 'live-capture-processor';

/** The server takes PCM16 mono 16 kHz WAV chunks of 1 to 8 s, at least 3 s apart. */
export const LIVE_CAPTURE_SAMPLE_RATE = 16_000;
export const LIVE_CAPTURE_CHUNK_SECONDS = 6;
export const LIVE_WAV_HEADER_BYTES = 44;
export const LIVE_WAV_MIME_TYPE = 'audio/wav';
export const LIVE_CHUNK_START_HEADER = 'X-Chunk-Start-At';

/** How often the feed reveal clock ticks for a capture session (cross-origin players expose no time). */
export const LIVE_WALL_CLOCK_TICK_MS = 1000;

/** Raw tab audio: the browser's voice processing would damage speech recognition of a stream. */
export const LIVE_CAPTURE_DISPLAY_MEDIA_OPTIONS: LiveDisplayMediaOptions = {
  video: true,
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  preferCurrentTab: true,
  selfBrowserSurface: 'include',
  systemAudio: 'include',
};

/**
 * Raw microphone audio for the phone fallback. Echo cancellation MUST stay off: it would cancel the
 * stream's own sound coming out of the speaker, which is exactly what is being analyzed.
 */
export const LIVE_CAPTURE_MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
};

/** The capture panel and consent dialog copy for each audio source. */
export const LIVE_CAPTURE_COPY: Record<LiveCaptureSource, LiveCaptureCopy> = {
  [LiveCaptureSource.TAB]: {
    analyzeKey: 'live.capture.analyze',
    requestingKey: 'live.capture.requesting',
    capturingKey: 'live.capture.capturing',
    hintKey: null,
    consentTitleKey: 'live.capture.consentTitle',
    consentDescriptionKey: 'live.capture.consentDescription',
    consentKeys: [
      'live.capture.consentShare',
      'live.capture.consentAudioOnly',
      'live.capture.consentOwnViewing',
      'live.capture.consentBilling',
    ],
    consentConfirmKey: 'live.capture.consentConfirm',
  },
  [LiveCaptureSource.MICROPHONE]: {
    analyzeKey: 'live.capture.analyzeMic',
    requestingKey: 'live.capture.requestingMic',
    capturingKey: 'live.capture.capturingMic',
    hintKey: 'live.capture.micHint',
    consentTitleKey: 'live.capture.consentMicTitle',
    consentDescriptionKey: 'live.capture.consentMicDescription',
    consentKeys: [
      'live.capture.consentMicAudio',
      'live.capture.consentMicNothingElse',
      'live.capture.consentOwnViewing',
      'live.capture.consentMicBilling',
    ],
    consentConfirmKey: 'live.capture.consentMicConfirm',
  },
};

/** A BROWSER_CAPTURE resolution's reasonCode when the server could not read the stream itself. */
export const LIVE_SERVER_PULL_UNAVAILABLE_REASON = 'SERVER_PULL_UNAVAILABLE';

/** Server pull reads Twitch only (YouTube and Kick refuse server reads without a bypass we do not build). */
export const LIVE_SERVER_PULL_PLATFORMS: ReadonlyArray<LivePlatform.TWITCH> = [LivePlatform.TWITCH];

/** A status in this set stops the capture: nothing more would be analyzed or billed. */
export const LIVE_CAPTURE_STOP_STATUSES: ReadonlySet<LiveStatusCode> = new Set([
  LiveStatusCode.EXHAUSTED,
  LiveStatusCode.CREDITS_REQUIRED,
  LiveStatusCode.FREE_EXHAUSTED,
  LiveStatusCode.ENDED,
  LiveStatusCode.COMPLETED,
  LiveStatusCode.UNSUPPORTED,
]);

/** Upload answers that mean the session can no longer take audio (stop instead of sending more). */
export const LIVE_CAPTURE_FATAL_UPLOAD_STATUSES: ReadonlySet<number> = new Set([404, 409, 422]);

export const LIVE_CAPTURE_ERROR_KEYS: Record<LiveCaptureError, string> = {
  [LiveCaptureError.NO_AUDIO]: 'live.capture.errorNoAudio',
  [LiveCaptureError.DENIED]: 'live.capture.errorDenied',
  [LiveCaptureError.MIC_DENIED]: 'live.capture.errorMicDenied',
  [LiveCaptureError.UNSUPPORTED]: 'live.capture.errorUnsupported',
  [LiveCaptureError.UPLOAD]: 'live.capture.errorUpload',
};

export const LIVE_CAPTURE_IDLE: LiveCaptureMachine = { state: LiveCaptureState.IDLE, error: null };

export const LIVE_EMPTY_EMBED_VIEW: LiveEmbedView = {
  playerUrl: null,
  chatUrl: null,
  watchUrl: null,
  platformName: null,
};
