import type { MediaGenerationState } from '../enums/media-generation-state.enum';
import type { MediaKind } from '../enums/media-kind.enum';
import type { AssembledContext } from './context.types';
import type { ExecutionOptions } from './execution-options.types';
import type { LlmResponse } from './execution.types';
import type { PluginModelRound } from './plugin-tools.types';

/** Where a generation stands, as the media services report it. */
export type MediaStatus =
  | 'QUEUED'
  | 'STARTING'
  | 'RUNNING'
  | 'GENERATING'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'CANCELLED';

/** One generation the chat model asked for; stored on the assistant message as `mediaGenerations`. */
export type MediaGenerationRef = {
  kind: MediaKind;
  id: string;
  status: MediaGenerationState;
  /** The prompt the media model got, capped. Shown by the card. */
  prompt: string;
};

/** What the gateway knows about one generation, whichever service holds it. */
export type MediaSnapshot = {
  id: string;
  status: MediaStatus;
  provider?: string | undefined;
  model?: string | undefined;
  assetUrl?: string | undefined;
  mimeType?: string | undefined;
  durationSec?: number | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  /** Image and video: the generation that replaced a failed one (AUTO fallback). */
  supersededById?: string | undefined;
};

export type MediaStartRequest = {
  kind: MediaKind;
  userId: string;
  prompt: string;
  provider: string;
  model?: string | undefined;
  threadId?: string | undefined;
  userMessageId?: string | undefined;
  workspaceId?: string | undefined;
  /** Image: pixels. Video: seconds and aspect ratio. Audio: voice, format and speech or music. */
  width?: number | undefined;
  height?: number | undefined;
  durationSeconds?: number | undefined;
  aspectRatio?: string | undefined;
  voice?: string | undefined;
  format?: string | undefined;
  audioKind?: 'SPEECH' | 'MUSIC' | undefined;
};

export type MediaStartOutcome =
  | { ok: true; id: string; provider: string; model: string }
  | { ok: false; reason: 'PLAN' | 'PAYMENT' | 'REJECTED' | 'UNAVAILABLE'; status: number };

export type MediaAwaitOptions = {
  pollMs: number;
  maxPolls: number;
  signal?: AbortSignal | undefined;
  /** Test seam: replaces the real wait between polls. */
  sleep?: ((ms: number) => Promise<void>) | undefined;
};

export type MediaAwaitOutcome =
  | { state: 'completed'; snapshot: MediaSnapshot }
  | { state: 'failed'; snapshot: MediaSnapshot }
  | { state: 'timeout'; snapshot: MediaSnapshot | undefined }
  | { state: 'cancelled'; snapshot: MediaSnapshot | undefined };

/** The validated arguments of one media tool call. */
export type MediaToolArgs = {
  kind: MediaKind;
  prompt: string;
  model?: string | undefined;
  size?: 'square' | 'portrait' | 'landscape' | undefined;
  durationSeconds?: number | undefined;
  aspectRatio?: '16:9' | '9:16' | undefined;
  voice?: string | undefined;
  format?: string | undefined;
  audioKind?: 'SPEECH' | 'MUSIC' | undefined;
};

export type MediaToolArgsResult =
  { ok: true; args: MediaToolArgs } | { ok: false; message: string };

export type MediaToolLoopArgs = {
  context: AssembledContext;
  executionOptions: ExecutionOptions | undefined;
  /** One paid model call. The caller owns billing: every round is its own chokepoint call. */
  callModel: (round: PluginModelRound) => Promise<LlmResponse>;
  /** The existing plan-upgrade answer, for a clear media request on a plan without media. */
  planRefusal: () => LlmResponse;
};

/** The provider and model one generation runs on. */
export type MediaTarget = { provider: string; model: string | undefined };

/** How long a chat answer waits for one generation: `maxPolls` reads, `pollMs` apart. */
export type MediaPollLimits = { pollMs: number; maxPolls: number };

/** What a tool-call step hands back to the model (JSON text) and whether it is an error. */
export type MediaCallOutcome = { content: string; isError: boolean };

/** The loop's running state for one answer. */
export type MediaLoopState = {
  context: AssembledContext;
  generations: MediaGenerationRef[];
  callsMade: number;
  planDenied: boolean;
  cancelled: boolean;
  turnKey: string;
  claimRetried: boolean;
};
