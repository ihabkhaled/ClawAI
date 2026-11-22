/** Mirrors claw-live-service LiveStatusCode (ADR-221). Never a fake success state. */
export enum LiveStatusCode {
  CONNECTING = 'CONNECTING',
  ANALYZING = 'ANALYZING',
  PAUSED = 'PAUSED',
  DELAYED = 'DELAYED',
  RECOVERING = 'RECOVERING',
  FREE_EXHAUSTED = 'FREE_EXHAUSTED',
  CREDITS_REQUIRED = 'CREDITS_REQUIRED',
  GRACE = 'GRACE',
  EXHAUSTED = 'EXHAUSTED',
  UNSUPPORTED = 'UNSUPPORTED',
  CAPACITY = 'CAPACITY',
  ENDED = 'ENDED',
  COMPLETED = 'COMPLETED',
}

/** SSE event names on GET /api/v1/live/sessions/:id/stream (architecture doc section 9). */
export enum LiveStreamEventType {
  CAPTION = 'caption',
  CAPTION_TRANSLATION = 'caption_translation',
  CARD = 'card',
  CARD_VERSION = 'card_version',
  HIGHLIGHT = 'highlight',
  STATUS = 'status',
  USAGE = 'usage',
}

/** Mirrors claw-live-service `LiveSessionState` (the viewer session row's state). */
export enum LiveSessionState {
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CREDITS_REQUIRED = 'CREDITS_REQUIRED',
  GRACE = 'GRACE',
  EXHAUSTED = 'EXHAUSTED',
  UNSUPPORTED = 'UNSUPPORTED',
  DETACHED = 'DETACHED',
}

/** Mirrors claw-live-service `LiveRunStatus` (admin overview, run stop). */
export enum LiveRunStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DELAYED = 'DELAYED',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  ENDED = 'ENDED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum LiveSourceKind {
  YOUTUBE = 'YOUTUBE',
  HLS = 'HLS',
  FIXTURE = 'FIXTURE',
  /** Twitch, Kick, Facebook and the link-only platforms (batch 2); YouTube rows stay YOUTUBE. */
  PLATFORM = 'PLATFORM',
}

/** Mirrors claw-live-service `LivePlatform`. Platform names are brands and are never translated. */
export enum LivePlatform {
  YOUTUBE = 'YOUTUBE',
  TWITCH = 'TWITCH',
  KICK = 'KICK',
  FACEBOOK = 'FACEBOOK',
  TIKTOK = 'TIKTOK',
  INSTAGRAM = 'INSTAGRAM',
  RUMBLE = 'RUMBLE',
  BIGO = 'BIGO',
  LINKEDIN = 'LINKEDIN',
  DISCORD = 'DISCORD',
  TELEGRAM = 'TELEGRAM',
  BILIBILI = 'BILIBILI',
  CHZZK = 'CHZZK',
  SOOP = 'SOOP',
  NIMO = 'NIMO',
}

export enum LiveCapability {
  PLAYER_ONLY = 'PLAYER_ONLY',
  AUDIO = 'AUDIO',
  AUDIO_VISION = 'AUDIO_VISION',
  /** No embeddable player: the modal shows a "Watch on <Platform>" button and no AI. */
  LINK_ONLY = 'LINK_ONLY',
  /** Plays in an embed; AI runs on the tab audio the viewer's own browser shares. */
  BROWSER_CAPTURE = 'BROWSER_CAPTURE',
}

export enum LiveMode {
  AUDIO = 'AUDIO',
  AUDIO_VISION = 'AUDIO_VISION',
  SMART_AUTO = 'SMART_AUTO',
}

export enum LiveFeedEventKind {
  SUMMARY = 'SUMMARY',
  HIGHLIGHT = 'HIGHLIGHT',
  VISUAL = 'VISUAL',
  GAP = 'GAP',
  FINAL = 'FINAL',
}

export enum LiveHighlightType {
  DECISION = 'DECISION',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  DEMONSTRATION = 'DEMONSTRATION',
  KEY_STATEMENT = 'KEY_STATEMENT',
  QUESTION = 'QUESTION',
  MILESTONE = 'MILESTONE',
  OTHER = 'OTHER',
}

export enum LiveHeartbeatState {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
}

export enum LiveExportFormat {
  PDF = 'PDF',
  MARKDOWN = 'MARKDOWN',
  TXT = 'TXT',
}

export enum LiveFeedTab {
  FEED = 'feed',
  CAPTIONS = 'captions',
  HIGHLIGHTS = 'highlights',
  CHAT = 'chat',
}

/** The browser tab-audio capture state machine: idle → requesting → capturing → stopped / error. */
export enum LiveCaptureState {
  IDLE = 'IDLE',
  REQUESTING = 'REQUESTING',
  CAPTURING = 'CAPTURING',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
}

/** Why a capture failed; each has its own message. */
export enum LiveCaptureError {
  NO_AUDIO = 'NO_AUDIO',
  DENIED = 'DENIED',
  UNSUPPORTED = 'UNSUPPORTED',
  UPLOAD = 'UPLOAD',
}

/** Events the capture state machine accepts. */
export enum LiveCaptureAction {
  REQUEST = 'REQUEST',
  STARTED = 'STARTED',
  STOP = 'STOP',
  FAIL = 'FAIL',
  RESET = 'RESET',
}

/** How loud a status banner is; maps to design-token colours. */
export enum LiveStatusTone {
  INFO = 'info',
  WARNING = 'warning',
  DANGER = 'danger',
  NEUTRAL = 'neutral',
}

/** Admin policy form: numeric fields (values are the form-state property names). */
export enum LivePolicyNumberField {
  GRACE_SECONDS = 'graceSeconds',
  MAX_ACTIVE_STREAMS = 'maxActiveStreams',
  MAX_SESSIONS_PER_USER = 'maxSessionsPerUser',
  SESSIONS_PER_USER_PER_HOUR = 'sessionsPerUserPerHour',
  DAILY_BUDGET_USD = 'dailyBudgetUsd',
  BUDGET_SOFT_STOP_PERCENT = 'budgetSoftStopPercent',
}

export enum LivePlanField {
  FREE_MINUTES = 'freeMinutes',
  PAID_USD_PER_MINUTE = 'paidUsdPerMinute',
}

export enum LivePolicyFlag {
  FEATURE_ENABLED = 'featureEnabled',
  KILL_SWITCH = 'killSwitch',
}
