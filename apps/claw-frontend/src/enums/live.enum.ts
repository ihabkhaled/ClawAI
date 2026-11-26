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
  DAILYMOTION = 'DAILYMOTION',
  X = 'X',
  VIMEO = 'VIMEO',
  TROVO = 'TROVO',
  DLIVE = 'DLIVE',
  HUYA = 'HUYA',
  DOUYU = 'DOUYU',
  DOUYIN = 'DOUYIN',
  TWITCASTING = 'TWITCASTING',
  NICONICO = 'NICONICO',
  PICARTO = 'PICARTO',
  ODYSEE = 'ODYSEE',
  RUTUBE = 'RUTUBE',
  VK = 'VK',
  OK = 'OK',
  REDDIT = 'REDDIT',
  STREAMABLE = 'STREAMABLE',
  NAVER_TV = 'NAVER_TV',
  KAKAO_TV = 'KAKAO_TV',
  WEIBO = 'WEIBO',
  SHOWROOM = 'SHOWROOM',
  LIVE17 = 'LIVE17',
  MIXCLOUD = 'MIXCLOUD',
  BLUESKY = 'BLUESKY',
  VK_PLAY_LIVE = 'VK_PLAY_LIVE',
  PEERTUBE = 'PEERTUBE',
  STEAM = 'STEAM',
  GOODGAME = 'GOODGAME',
  YOUNOW = 'YOUNOW',
  RAIPLAY = 'RAIPLAY',
  RAIPLAY_SOUND = 'RAIPLAY_SOUND',
  BFMTV = 'BFMTV',
  CBS_NEWS = 'CBS_NEWS',
  LRT = 'LRT',
  FRANCE_TV = 'FRANCE_TV',
  ROYA = 'ROYA',
  MATCH_TV = 'MATCH_TV',
  RTVC_PLAY = 'RTVC_PLAY',
  TUNEIN = 'TUNEIN',
  WEBCAMERA_PL = 'WEBCAMERA_PL',
  TED = 'TED',
  SOUNDCLOUD = 'SOUNDCLOUD',
  BANDCAMP = 'BANDCAMP',
  ARCHIVE_ORG = 'ARCHIVE_ORG',
  NINEGAG = 'NINEGAG',
  PINTEREST = 'PINTEREST',
  BITCHUTE = 'BITCHUTE',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  DROPBOX = 'DROPBOX',
  LOOM = 'LOOM',
  SPREAKER = 'SPREAKER',
  APPLE_PODCASTS = 'APPLE_PODCASTS',
  MEDAL = 'MEDAL',
  UN_WEB_TV = 'UN_WEB_TV',
  ZHIHU = 'ZHIHU',
  CNN = 'CNN',
  VIDLII = 'VIDLII',
  FLICKR = 'FLICKR',
  ACFUN = 'ACFUN',
  IMGUR = 'IMGUR',
}

export enum LiveCapability {
  PLAYER_ONLY = 'PLAYER_ONLY',
  AUDIO = 'AUDIO',
  AUDIO_VISION = 'AUDIO_VISION',
  /** No embeddable player: the modal shows a "Watch on <Platform>" button and no AI. */
  LINK_ONLY = 'LINK_ONLY',
  /** Plays in an embed; AI runs on the tab audio the viewer's own browser shares. */
  BROWSER_CAPTURE = 'BROWSER_CAPTURE',
  /** Plays in an embed; ClawAI's server reads the stream itself and shares the analysis with every viewer. */
  SERVER_PULL = 'SERVER_PULL',
  /** A recorded video (reel, post, past stream): the server plays it along from the start, private to the viewer. */
  RECORDED = 'RECORDED',
}

/** Whether a feed card can be shown in the viewer's language yet (2026-11-26 consistency fix). */
export enum LiveCardLanguageState {
  /** Written in, or translated to, the viewer's language. */
  READY = 'READY',
  /** In another language and its translation has not arrived yet: show "Translating…". */
  PENDING = 'PENDING',
  /** No translation came in time: the original is shown, marked as such. */
  ORIGINAL = 'ORIGINAL',
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
  /** The detailed report of a one-click video summary (moments about every 10 s, chapters). */
  REPORT = 'REPORT',
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

/** Where browser capture takes its audio: this tab (desktop) or the microphone (phones). */
export enum LiveCaptureSource {
  TAB = 'TAB',
  MICROPHONE = 'MICROPHONE',
}

/** Why a capture failed; each has its own message. */
export enum LiveCaptureError {
  NO_AUDIO = 'NO_AUDIO',
  DENIED = 'DENIED',
  /** The microphone permission is blocked: unlike a cancelled tab picker, the viewer must act. */
  MIC_DENIED = 'MIC_DENIED',
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
  SERVER_PULL = 'serverPull',
}

/** Where the newest caption sits over the player. */
export enum LiveCaptionPlacement {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
}
