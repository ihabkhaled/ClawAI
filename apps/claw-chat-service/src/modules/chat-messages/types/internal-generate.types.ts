import type { PaygHold } from '@claw/shared-entitlements';
import type { PaygSurface } from '@claw/shared-types';

export type InternalGenerateRequest = {
  /** Who the provider call is billed to. Required: an unattributable paid call is refused. */
  userId: string;
  /** Which product surface spent the credit, so "where did my $5 go" stays answerable. */
  surface: PaygSurface;
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  /** Narrows the surface to the specific action, e.g. the workspace AI action name. */
  workflow?: string;
};

/** Everything `generateOnce` and `generateOnceStream` accept (the validated DTO). */
export type InternalGenerateArgs = InternalGenerateRequest & {
  requestId?: string;
  threadJobBudgetId?: string;
  /** Whether a reasoning model may think first. Absent means it may not. */
  thinking?: boolean;
};

export type InternalGenerateResponse = {
  content: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
  /**
   * True when the output ceiling was cut down to fit the caller's remaining
   * pay-as-you-go credit.
   *
   * Returned so the calling service can tell its own user the answer was
   * shortened by their balance rather than by the model. A silently short
   * answer is the failure this field exists to prevent.
   */
  clamped: boolean;
  /**
   * What this call cost, in integer micro-USD, for a pay-as-you-go user only.
   *
   * Taken from the settled outcome through `paygDisclosableCost`: absent for a
   * subscriber, a trial, an administrator, an unmetered call or a settlement
   * that failed, and `0` is a real value. Never an estimate.
   */
  costMicroUsd?: number;
};

/** What the controller hands the stream runner besides the request. */
export type InternalGenerateStreamOptions = {
  /** Aborted when the caller goes away; stops the provider call and gives the hold back. */
  signal: AbortSignal;
  /** Called with the size of every chunk the provider actually sent. */
  onActivity: (chunkChars: number) => void;
};

/**
 * One line of the `generate-stream` response body.
 *
 * `activity` is written only when provider bytes arrived, never on a timer: a
 * timer ping would make a stuck model look alive. Exactly one terminal line
 * (`result` or `error`) ends the stream.
 */
export type InternalGenerateFrame =
  | { type: 'activity' }
  | { type: 'result'; data: InternalGenerateResponse }
  | { type: 'error'; status: number; code: string; message: string };

export type InternalGenerateErrorFrame = Extract<InternalGenerateFrame, { type: 'error' }>;

/** The provider hop of one internal generate call, after the hold exists. */
export type PreparedInternalGenerate = {
  hold: PaygHold;
  provider: string;
  model: string;
  url: string;
  allowedHosts: ReadonlySet<string>;
  apiKey: string;
  gatewayHeaders?: Record<string, string>;
  isOllamaConnector: boolean;
  /** False when the connector says the provider cannot stream. */
  streaming: boolean;
  promptTextForEstimate: string;
  messages: { role: string; content: string }[];
  cappedMaxTokens: number;
};

/** The slice of an HTTP response the NDJSON writer needs, so a test can hand it a plain object. */
export type NdjsonSink = {
  writableEnded: boolean;
  destroyed: boolean;
  statusCode: number;
  setHeader: (name: string, value: string) => unknown;
  flushHeaders: () => void;
  write: (chunk: string) => unknown;
  end: () => unknown;
};

/** A sink that also reports when the other side goes away. */
export type NdjsonResponse = NdjsonSink & {
  once: (event: 'close', listener: () => void) => unknown;
  off: (event: 'close', listener: () => void) => unknown;
};
