import type { RefObject } from 'react';

import type {
  LiveCapability,
  LiveCaptureAction,
  LiveCaptureError,
  LiveCaptureSource,
  LiveCaptureState,
  LiveExportFormat,
  LiveFeedEventKind,
  LiveFeedTab,
  LiveHeartbeatState,
  LiveHighlightType,
  LiveMode,
  LivePlatform,
  LivePolicyNumberField,
  LiveSessionState,
  LiveSourceKind,
  LiveStatusCode,
  LiveStatusTone,
  LiveStreamEventType,
} from '@/enums/live.enum';
import type { ModelPickerGroup } from '@/types/component.types';
import type { TranslateFunction } from '@/types/i18n.types';

// ─── API contract (architecture doc section 9). Field names mirror the backend. ─────

export type LiveResolveSourceInput = { url: string };

/**
 * The platform fields batch 2 adds to resolve and create-session. `watchUrl` is the platform's own
 * public page; `embedNeedsParent` (Twitch) and `chatNeedsEmbedDomain` (YouTube chat) ask the browser
 * to append its own hostname, which only the browser knows.
 */
export type LivePlatformFields = {
  platform: LivePlatform | null;
  chatEmbedUrl: string | null;
  watchUrl: string;
  embedNeedsParent: boolean;
  chatNeedsEmbedDomain: boolean;
};

export type LiveSourceResolution = LivePlatformFields & {
  sourceKind: LiveSourceKind;
  capability: LiveCapability;
  embedUrl: string | null;
  reasonCode: string | null;
};

export type LiveCreateSessionInput = {
  url: string;
  language: string;
  mode: LiveMode;
  attestRights: boolean;
};

/** Session-scoped billing counters (`usage` on create and heartbeat). Money is integer micro-USD. */
export type LiveSessionUsage = {
  billedSeconds: number;
  pendingSeconds: number;
  spentMicroUsd: number;
  paidApproved: boolean;
  spendingCapMicroUsd: number | null;
  month: LiveUsage;
};

/** `POST /sessions` response. `closeToken` authorises the pagehide beacon. */
export type LiveSession = LivePlatformFields & {
  sessionId: string;
  runId: string | null;
  streamId: string;
  sourceKind: LiveSourceKind;
  capability: LiveCapability;
  embedUrl: string | null;
  playbackUrl: string | null;
  state: LiveSessionState;
  usage: LiveSessionUsage;
  closeToken: string;
};

/** `seekableFromAt` is omitted (never null) when the player has no seekable window. */
export type LiveHeartbeatInput = {
  state: LiveHeartbeatState;
  playbackAt: number;
  atLiveEdge: boolean;
  seekableFromAt?: number;
};

export type LiveHeartbeatResult = {
  state: LiveSessionState;
  statusCode: LiveStatusCode;
  usage: LiveSessionUsage;
};

/** One tab-audio chunk for `POST /sessions/:id/audio`: a PCM16 mono 16 kHz WAV and its start (epoch ms). */
export type LiveAudioChunkInput = { wav: Blob; startAt: number };

export type LiveAudioChunkResult = { accepted: boolean };

export type LiveApproveCreditsInput = { spendingCapMicroUsd?: number };

/** `POST /sessions/:id/approve-credits`, `PATCH` and `DELETE /sessions/:id` response. */
export type LiveSessionStateView = {
  sessionId: string;
  state: LiveSessionState;
  language: string;
  runId: string | null;
};

/** `GET /usage`: this month's free seconds and the active policy's price (no session state). */
export type LiveUsage = {
  month: string;
  freeSecondsTotal: number;
  freeSecondsUsed: number;
  paidMicroUsdPerMinute: number;
  graceSeconds: number;
  policyVersion: number;
};

export type LiveCursorPage<T> = { items: T[]; nextCursor: string | null };

/** `GET /history` item. `sourceUrl` is null unless the source is public or the caller's own. */
export type LiveHistoryItem = {
  id: string;
  runId: string | null;
  streamId: string;
  title: string | null;
  sourceKind: LiveSourceKind;
  sourceUrl: string | null;
  mode: LiveMode;
  language: string;
  state: LiveSessionState;
  startedAt: string;
  detachedAt: string | null;
  billedSeconds: number;
};

/** `GET /history/:sessionId/events` item; title/body are already translated when `translated`. */
export type LiveHistoryEvent = {
  id: string;
  eventKey: string | null;
  kind: LiveFeedEventKind;
  highlightType: LiveHighlightType | null;
  startAt: number;
  endAt: number | null;
  importance: number;
  confidence: number | null;
  title: string;
  body: string;
  evidence: unknown;
  version: number;
  translated: boolean;
};

export type LiveDeletionSummary = {
  sessionsDeleted: number;
  skippedActive: number;
  runsDeleted: number;
};

/** One SSE frame's JSON (`data:`); media times are epoch milliseconds. */
export type LiveStreamEvent = {
  type: LiveStreamEventType;
  runId: string;
  startAt: number;
  endAt?: number;
  language?: string;
  status?: LiveStatusCode;
  data: Record<string, unknown>;
};

/** A summary, highlight, visual note, gap or final card (live and in history). */
export type LiveFeedCard = {
  eventId: string;
  kind: LiveFeedEventKind;
  title: string;
  body: string;
  importance: number;
  version: number;
  startAt: number;
  endAt: number | null;
  highlightType: LiveHighlightType | null;
  translatedTitle?: string;
  translatedBody?: string;
};

export type LiveCaption = {
  segmentId: string;
  text: string;
  startAt: number;
  endAt: number | null;
  uncertain: boolean;
};

export type LiveCardVersion = {
  version: number;
  title: string;
  body: string;
  createdAt: string;
};

/** `modelId` is the bare model; `provider` comes from the picked model-list entry. */
export type LiveEnhanceInput = { modelId: string; provider: string; confirm: boolean };

export type LiveEnhanceEstimate = {
  confirmed: false;
  eventId: string;
  eventVersion: number;
  modelId: string;
  estimatedMicroUsd: number;
};

export type LiveEnhanceOutcome = {
  confirmed: true;
  enhancementId: string;
  eventId: string;
  eventVersion: number;
  modelId: string;
  body: string;
  costMicroUsd: number;
  replayed: boolean;
};

export type LiveEnhanceResult = LiveEnhanceEstimate | LiveEnhanceOutcome;

export type LiveExportInput = { format: LiveExportFormat };

// ─── Client state ────────────────────────────────────────────────────────────────

export type LiveFeedState = {
  captions: LiveCaption[];
  /** segmentId → caption text in the session language. */
  captionTranslations: Record<string, string>;
  cards: LiveFeedCard[];
  highlights: LiveFeedCard[];
  status: LiveStatusCode;
  /** Latest session usage (heartbeat response, or an SSE `usage` frame). */
  usage: LiveSessionUsage | null;
};

export type LiveRevealedCaption = { text: string; translated: boolean; uncertain: boolean };

/** Seekable window in media epoch ms. */
export type LiveSeekableRange = { fromAt: number; toAt: number };

export type LiveModeOption = { mode: LiveMode; labelKey: string };

export type LivePolicyNumberFieldOption = { field: LivePolicyNumberField; labelKey: string };

export type LiveExportOption = { format: LiveExportFormat; labelKey: string; extension: string };

export type LiveStatusPresentation = {
  titleKey: string;
  descriptionKey: string;
  tone: LiveStatusTone;
};

export type LiveHlsPlayerHandle = {
  /** Media epoch ms of the current frame, when the stream carries a program date. */
  getPlayingDateMs: () => number | null;
  /** Distance to the live edge, when the player knows it. */
  getLatencyMs: () => number | null;
  /** Live sync position in seconds of media timeline. */
  getLiveSyncPosition: () => number | null;
  destroy: () => void;
};

export type LiveHlsAttachOptions = {
  video: HTMLVideoElement;
  src: string;
  getToken: () => string | null;
  onFatalError: (error: Error) => void;
};

export type LiveVideoWithStartDate = HTMLVideoElement & { getStartDate?: () => Date };

export type LivePlaybackSnapshot = {
  playbackAt: number;
  isPaused: boolean;
  seekable: LiveSeekableRange | null;
  liveEdgeAt: number | null;
};

/** What the player and side panel show for a session's platform, already allowlisted and with parent/embed_domain. */
export type LiveEmbedView = {
  playerUrl: string | null;
  chatUrl: string | null;
  watchUrl: string | null;
  platformName: string | null;
};

export type LiveCaptureMachine = { state: LiveCaptureState; error: LiveCaptureError | null };

export type LiveCaptureEvent =
  | { type: LiveCaptureAction.REQUEST }
  | { type: LiveCaptureAction.STARTED }
  | { type: LiveCaptureAction.STOP }
  | { type: LiveCaptureAction.RESET }
  | { type: LiveCaptureAction.FAIL; error: LiveCaptureError };

export type LiveAudioChunkerOptions = {
  inputRate: number;
  outputRate: number;
  chunkSeconds: number;
  now: () => number;
  onChunk: (chunk: LiveAudioChunkInput) => void;
};

export type LiveAudioChunker = {
  push: (frame: Float32Array) => void;
  reset: () => void;
};

export type LiveTabCaptureOptions = {
  /** Where the audio comes from; the rest of the pipeline is the same. */
  source: LiveCaptureSource;
  onChunk: (chunk: LiveAudioChunkInput) => void;
  onEnded: () => void;
};

export type LiveTabCaptureHandle = { stop: () => void };

/** i18n keys the capture panel and consent dialog show for one audio source. */
export type LiveCaptureCopy = {
  analyzeKey: string;
  requestingKey: string;
  capturingKey: string;
  hintKey: string | null;
  consentTitleKey: string;
  consentDescriptionKey: string;
  consentKeys: ReadonlyArray<string>;
  consentConfirmKey: string;
};

/** `getDisplayMedia` options; the extra hints are newer than some lib.dom versions. */
export type LiveDisplayMediaOptions = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: string;
  systemAudio?: string;
};

// ─── Hook results ────────────────────────────────────────────────────────────────

export type UseLiveStartFormResult = {
  url: string;
  language: string;
  mode: LiveMode;
  attestRights: boolean;
  resolution: LiveSourceResolution | null;
  isResolving: boolean;
  resolveError: string | null;
  canStart: boolean;
  setUrl: (value: string) => void;
  setLanguage: (value: string) => void;
  setMode: (value: string) => void;
  setAttestRights: (value: boolean) => void;
  resolve: () => void;
  buildSessionInput: () => LiveCreateSessionInput | null;
};

export type UseLiveHistoryResult = {
  items: LiveHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

export type UseLiveHistoryActionsResult = {
  pendingId: string | null;
  confirmDeleteId: string | null;
  confirmDeleteAll: boolean;
  isDeleting: boolean;
  askDelete: (id: string) => void;
  askDeleteAll: () => void;
  cancelDelete: () => void;
  confirmDelete: () => void;
  exportHistory: (id: string, format: LiveExportFormat) => void;
};

export type UseLiveUsageResult = {
  usage: LiveUsage | null;
  isLoading: boolean;
  isError: boolean;
};

export type UseLivePageResult = {
  t: TranslateFunction;
  locale: string;
  form: UseLiveStartFormResult;
  history: UseLiveHistoryResult;
  historyActions: UseLiveHistoryActionsResult;
  usage: UseLiveUsageResult;
  sessionInput: LiveCreateSessionInput | null;
  detailId: string | null;
  start: () => void;
  closeModal: () => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
};

export type UseLiveSessionResult = {
  session: LiveSession | null;
  isCreating: boolean;
  error: string | null;
};

export type UseLiveHeartbeatOptions = {
  sessionId: string | null;
  enabled: boolean;
  getSnapshot: () => LiveHeartbeatInput | null;
  onStatus: (status: LiveStatusCode) => void;
  onUsage: (usage: LiveSessionUsage) => void;
};

export type UseLiveHeartbeatResult = { sendNow: () => void; hasError: boolean };

export type UseLiveStreamResult = {
  feed: LiveFeedState;
  isReconnecting: boolean;
  isLost: boolean;
  setStatus: (status: LiveStatusCode) => void;
  setUsage: (usage: LiveSessionUsage) => void;
};

export type UseLivePlayerOptions = {
  hlsSrc: string | null;
  onPlaybackChange: () => void;
};

export type UseLivePlayerResult = {
  videoRef: RefObject<HTMLVideoElement | null>;
  snapshot: LivePlaybackSnapshot;
  hasPlayerError: boolean;
  readSnapshot: () => LivePlaybackSnapshot;
  seekTo: (mediaAt: number) => void;
  jumpToLive: () => void;
};

export type UseLiveCreditsResult = {
  capUsd: string;
  capInvalid: boolean;
  isApproving: boolean;
  setCapUsd: (value: string) => void;
  approve: () => void;
};

export type UseLiveCardEnhanceResult = {
  groups: ModelPickerGroup[];
  isLoadingModels: boolean;
  modelValue: string | null;
  estimateMicroUsd: number | null;
  content: string | null;
  isEstimating: boolean;
  isEnhancing: boolean;
  setModelValue: (value: string | null) => void;
  estimate: () => void;
  confirm: () => void;
};

export type UseLiveCardVersionsResult = {
  open: boolean;
  setOpen: (open: boolean) => void;
  versions: LiveCardVersion[];
  isLoading: boolean;
  isError: boolean;
};

export type UseLiveFeedScrollResult = {
  containerRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
};

export type UseLiveHistoryDetailResult = {
  t: TranslateFunction;
  locale: string;
  events: LiveFeedCard[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  loadMore: () => void;
};

export type LiveModalPlaybackCapture = { isCapture: boolean; isCapturing: boolean };

export type UseLiveCaptureOptions = {
  sessionId: string | null;
  enabled: boolean;
  status: LiveStatusCode;
};

export type UseLiveCaptureResult = {
  /** Tab audio, the microphone fallback, or null when this browser can capture neither. */
  source: LiveCaptureSource | null;
  state: LiveCaptureState;
  error: LiveCaptureError | null;
  isCapturing: boolean;
  consentOpen: boolean;
  openConsent: () => void;
  closeConsent: () => void;
  confirm: () => void;
  stop: () => void;
};

export type UseLiveModalResult = {
  t: TranslateFunction;
  locale: string;
  session: LiveSession | null;
  sessionError: string | null;
  isCreating: boolean;
  isPlayerOnly: boolean;
  isLinkOnly: boolean;
  isCapture: boolean;
  /** ClawAI's server analyzes the stream: no capture panel, the feed follows the wall clock. */
  isServerPull: boolean;
  /**
   * The player area is a "Watch on <Platform>" link-out: a LINK_ONLY session, or a SERVER_PULL one
   * with no embeddable player (TikTok LIVE, Rumble, BIGO LIVE, …), whose analysis feed still shows.
   */
  isPlayerLinkOut: boolean;
  embed: LiveEmbedView;
  capture: UseLiveCaptureResult;
  hlsSrc: string | null;
  player: UseLivePlayerResult;
  status: LiveStatusCode;
  showCreditsPanel: boolean;
  usage: LiveUsage | null;
  isReconnecting: boolean;
  isLost: boolean;
  caption: LiveRevealedCaption | null;
  captions: LiveCaption[];
  captionTranslations: Record<string, string>;
  cards: LiveFeedCard[];
  highlights: LiveFeedCard[];
  isBehindLive: boolean;
  tab: LiveFeedTab;
  setTab: (tab: string) => void;
  controlsOpen: boolean;
  toggleControls: () => void;
};

// ─── Component props ─────────────────────────────────────────────────────────────

export type LiveStartFormProps = {
  form: UseLiveStartFormResult;
  t: TranslateFunction;
  onStart: () => void;
};

export type LiveSourceNoticeProps = {
  resolution: LiveSourceResolution;
  attestRights: boolean;
  onAttestChange: (value: boolean) => void;
  t: TranslateFunction;
};

export type LiveUsageCardProps = {
  usage: UseLiveUsageResult;
  t: TranslateFunction;
  locale: string;
};

export type LiveHistoryListProps = {
  history: UseLiveHistoryResult;
  actions: UseLiveHistoryActionsResult;
  t: TranslateFunction;
  locale: string;
  onOpen: (id: string) => void;
};

export type LiveHistoryRowProps = {
  item: LiveHistoryItem;
  isPending: boolean;
  t: TranslateFunction;
  locale: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string, format: LiveExportFormat) => void;
};

export type LiveHistoryDetailDialogProps = {
  sessionId: string | null;
  onClose: () => void;
};

export type LiveModalProps = { input: LiveCreateSessionInput; onClose: () => void };

export type LivePlayerProps = {
  embed: LiveEmbedView;
  isLinkOnly: boolean;
  hlsSrc: string | null;
  player: UseLivePlayerResult;
  caption: LiveRevealedCaption | null;
  t: TranslateFunction;
};

export type LiveNoticeBoxProps = { testId: string; title: string; lines: string[] };

export type LiveLinkOnlyPlayerProps = { embed: LiveEmbedView; t: TranslateFunction };

export type LiveWatchLinkProps = { embed: LiveEmbedView; t: TranslateFunction };

export type LiveChatPanelProps = { embed: LiveEmbedView; t: TranslateFunction };

export type LiveChatLinkProps = { embed: LiveEmbedView; t: TranslateFunction };

export type LiveNoAiPanelProps = {
  embed: LiveEmbedView;
  isLinkOnly: boolean;
  t: TranslateFunction;
};

export type LiveCapturePanelProps = { capture: UseLiveCaptureResult; t: TranslateFunction };

export type LiveCaptureConsentDialogProps = {
  copy: LiveCaptureCopy;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t: TranslateFunction;
};

export type LiveCaptionsOverlayProps = { caption: LiveRevealedCaption | null; label: string };

export type LiveStatusBannerProps = {
  status: LiveStatusCode;
  isReconnecting: boolean;
  isLost: boolean;
  t: TranslateFunction;
};

export type LiveCreditsPanelProps = {
  sessionId: string;
  usage: LiveUsage | null;
  t: TranslateFunction;
  locale: string;
};

export type LiveSidePanelProps = {
  modal: UseLiveModalResult;
};

export type LiveFeedListProps = {
  cards: LiveFeedCard[];
  t: TranslateFunction;
  locale: string;
  allowEnhance: boolean;
  emptyLabel: string;
};

export type LiveFeedCardProps = {
  card: LiveFeedCard;
  t: TranslateFunction;
  locale: string;
  allowEnhance: boolean;
};

export type LiveCardEventProps = { eventId: string; t: TranslateFunction; locale: string };

export type LiveCaptionsListProps = {
  captions: LiveCaption[];
  translations: Record<string, string>;
  t: TranslateFunction;
  locale: string;
};

export type LiveTimelineProps = {
  highlights: LiveFeedCard[];
  seekable: LiveSeekableRange | null;
  playbackAt: number;
  t: TranslateFunction;
  locale: string;
  onSeek: (mediaAt: number) => void;
};

export type LiveTimelineMarkerProps = {
  card: LiveFeedCard;
  positionPercent: number;
  canSeek: boolean;
  label: string;
  onSeek: (mediaAt: number) => void;
};
