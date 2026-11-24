import type { z } from 'zod';

import type { LiveChunkOutcome } from '../../../common/enums/live-chunk-outcome.enum';
import type { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';
import type {
  LiveHighlightType,
  LiveMode,
  LivePipelineStage,
  LiveRunStatus,
  LiveSourceKind,
  Prisma,
} from '../../../generated/prisma';
import type { summaryReplySchema, transcribeReplySchema } from '../schemas/processing.schemas';
import type { LiveStreamEvent } from '../../realtime/types/live-stream-event.types';
import type { ResolvedPull } from '../../sources/types/server-pull.types';

/** The fencing token a worker holds for one claimed run (section 3). */
export interface RunLease {
  runId: string;
  generation: number;
}

/** Interactive-transaction client handed to a fenced write. */
export type FencedTx = Prisma.TransactionClient;

export interface ClaimedRunRow {
  id: string;
  generation: number;
}

/** Everything a RunWorker needs about its run and source. */
export interface WorkerContext {
  lease: RunLease;
  streamId: string;
  mode: LiveMode;
  sourceKind: LiveSourceKind;
  sourceUrl: string;
  declaredHost: string | null;
  startedAt: Date;
}

export interface TranscriptLine {
  /** LiveTranscriptSegment.id (the translation cache target). */
  id: string;
  seq: number;
  startAt: number;
  endAt: number;
  text: string;
  language: string | null;
}

export interface OpenCard {
  id: string;
  eventKey: string;
  title: string;
  body: string;
  version: number;
  startAt: number;
  importance: number;
}

export interface RememberedHighlight {
  type: LiveHighlightType;
  text: string;
  at: number;
}

export interface VisualNote {
  at: number;
  description: string;
}

/** A worker's short-term memory (section 4): never the whole stream. */
export interface RunMemory {
  workingSummary: string;
  openCard: OpenCard | null;
  recent: TranscriptLine[];
  /** Transcript media ms accumulated since the last summary call. */
  pendingTranscriptMs: number;
  /** First line after the last summary call: where a new topic card starts. */
  pendingFirst: TranscriptLine | null;
  lastSpeechEndAt: number | null;
  lastMediaAt: number | null;
  lastSummaryWallAt: number;
  lastSnapshotWallAt: number;
  highlights: RememberedHighlight[];
  visualNotes: VisualNote[];
  processedMs: number;
  vision: VisionState;
  /** Last spoken language the run detected; a Latin line with no reported language inherits it. */
  spokenLanguage: string | null;
  /** Web search results the summarizer asked for, newest last (bounded). */
  webNotes: WebNote[];
  research: ResearchState;
}

/** One web search result the summarizer reads as context (title + snippet + host, never a URL). */
export interface WebNote {
  query: string;
  title: string;
  snippet: string;
  host: string;
}

export interface ResearchState {
  lastWallAt: number;
  count: number;
  /** Lower-cased queries already searched in this run, so a repeat is skipped. */
  queries: string[];
}

export interface VisionState {
  lastSampleWallAt: number;
  lastKeptWallAt: number;
  lastThumb: Buffer | null;
}

export interface AudioChunk {
  wav: Buffer;
  startAt: number;
  endAt: number;
}

export interface PlaylistSegment {
  uri: string;
  sequence: number;
  durationMs: number;
  programDateMs: number | null;
}

export interface PlaylistVariant {
  uri: string;
  bandwidth: number;
  /** EXT-X-STREAM-INF carries a RESOLUTION (an audio-only rendition has none). */
  hasVideo: boolean;
}

/** A server-pulled platform stream: its CDN host suffixes and a fresh-playlist resolver. */
export interface ServerPullSource {
  /** The stream's playlist and CDN host suffixes (`fresh` = a new token), or null when offline. */
  resolve: (fresh: boolean) => Promise<ResolvedPull | null>;
}

export interface ParsedPlaylist {
  segments: PlaylistSegment[];
  variants: PlaylistVariant[];
  endList: boolean;
  mapUri: string | null;
}

export interface ChunkPoll {
  chunks: AudioChunk[];
  ended: boolean;
  /** Most recent media segment on disk (for a vision frame), or null. */
  latestSegmentFile: string | null;
}

/** Where a RunWorker gets its audio: the HLS/fixture puller or the browser-capture queue. */
export interface RunChunkSource {
  poll(): Promise<ChunkPoll>;
  dispose(): Promise<void>;
}

export type TranscribeReply = z.infer<typeof transcribeReplySchema>;
export type SummaryReply = z.infer<typeof summaryReplySchema>;

export interface ModelRequest {
  system: string;
  user: string;
  maxTokens: number;
  imageJpegBase64?: string;
}

export interface ModelReply {
  content: string;
  connector: string;
  model: string;
  latencyMs: number;
}

export interface ConnectorConfig {
  apiKey: string;
  baseUrl: string;
}

export interface RunStatusSnapshot {
  status: LiveRunStatus;
}

export interface CardTranslationTarget {
  id: string;
  title: string;
  body: string;
  version: number;
  startAt: number;
  language: string | null;
}

export interface ChunkResult {
  outcome: LiveChunkOutcome;
  line: TranscriptLine | null;
}

/** A card the summarizer changed, to be translated for the run's viewer languages. */
export interface ChangedCard {
  target: CardTranslationTarget;
  type: LiveStreamEventType;
}

export interface ProviderCostInput {
  idempotencyKey: string;
  runId: string;
  stage: LivePipelineStage;
  provider: string;
  model: string | null;
  units?: number;
  costMicroUsd?: number;
  latencyMs?: number | null;
  succeeded: boolean;
}

/** The transcript span a summary call covered. */
export interface SummarySpan {
  first: TranscriptLine;
  last: TranscriptLine;
}

export interface CardOutcome {
  open: OpenCard;
  closed: OpenCard | null;
  events: LiveStreamEvent[];
  changed: LiveStreamEventType[];
}

export interface HighlightOutcome {
  events: LiveStreamEvent[];
  remembered: RememberedHighlight[];
  /** New highlights, sent for translation once the commit lands. */
  targets: Omit<CardTranslationTarget, 'language'>[];
}
