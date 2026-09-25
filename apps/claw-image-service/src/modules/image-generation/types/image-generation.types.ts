import {
  type PaygFinalizeCalls,
  type PaygFinalizeUsage,
  type PaygHold,
} from '@claw/shared-entitlements';
import { type RuntimeProgressStage, type TokenUsage } from '@claw/shared-types';

import { type ImageAssetRole, type ImageGenerationStatus } from '../../../generated/prisma';
import { type ImageProgressCallback } from './image-progress.types';

export type ImageGenerationRecord = {
  id: string;
  userId: string;
  threadId: string | null;
  userMessageId: string | null;
  assistantMessageId: string | null;
  prompt: string;
  revisedPrompt: string | null;
  provider: string;
  model: string;
  width: number;
  height: number;
  quality: string | null;
  style: string | null;
  status: ImageGenerationStatus;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  latencyMs: number | null;
  /** The row that took this job over (auto-fallback or retry-alternate), or null. */
  supersededById: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** OUTPUT assets only — the reference image is never listed here. */
  assets: ImageGenerationAssetRecord[];
};

/**
 * The newest row reached by following `supersededById` from the one asked
 * for — what the user actually got. Equal to the asked-for row when nothing
 * superseded it.
 */
export type ImageGenerationLatestSummary = {
  id: string;
  status: ImageGenerationStatus;
  provider: string;
  model: string;
  errorCode: string | null;
  errorMessage: string | null;
  supersededById: string | null;
  assets: ImageGenerationAssetRecord[];
};

/** `GET /images/:id`: the row asked for, plus the head of its chain. */
export type ImageGenerationView = ImageGenerationRecord & {
  latest: ImageGenerationLatestSummary;
};

/** What a new row is created from — a fresh send, a fallback or an alternate. */
export type CreateImageGenerationData = {
  userId: string;
  threadId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  prompt: string;
  provider: string;
  model: string;
  width?: number;
  height?: number;
  quality?: string;
  style?: string;
};

/** A stored reference image: the file-service id it lives under, and its type. */
export type ImageReferenceAssetInput = {
  generationId: string;
  fileId: string;
  mimeType: string;
};

/** The slice of file-service's `GET /internal/files/:id/content` a retry reads. */
export type ImageReferenceFileResponse = {
  mimeType: string;
  /** base64 of the stored bytes (never extracted text). */
  content: string | null;
};

/** Reference bytes ready for a provider call. */
export type ImageReference = {
  base64: string;
  mimeType?: string;
};

/**
 * Hands a failed attempt to the next one. Returns the successor's id, or
 * undefined when the chain ends here.
 */
export type ImageSuccessorSpawner = (
  failed: ImageGenerationRecord,
  described: ImageFailureDescription,
) => Promise<string | undefined>;

/** One run of `processJob`. */
export type ImageAttemptOptions = {
  /** In-memory reference from the send; absent on a retry, which reads the stored one. */
  reference?: ImageReference;
  /** AUTO only: creates and links the next attempt when this one fails. */
  spawnSuccessor?: ImageSuccessorSpawner;
};

/** Mutable state of one AUTO fallback walk, owned by that walk alone. */
export type ImageFallbackChainState = {
  attempts: number;
  paidBlocked: boolean;
};

/**
 * The observed part of a runtime-progress envelope forwarded over SSE: the
 * stage, plus only the numbers the runtime itself reported. A percentage is
 * included only when the runtime measured it (`EXACT` / `RUNTIME_REPORTED`),
 * never an estimate.
 */
export type ImageProgressSnapshot = {
  stage: RuntimeProgressStage;
  currentStep?: number;
  totalSteps?: number;
  elapsedMs?: number;
  progressPercent?: number;
};

export type ImageGenerationAssetRecord = {
  id: string;
  generationId: string;
  storageKey: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  role: ImageAssetRole;
  createdAt: Date;
};

export type GenerateImageParams = {
  prompt: string;
  provider: string;
  model: string;
  userId: string;
  threadId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  width?: number;
  height?: number;
  quality?: string;
  style?: string;
  isAutoMode?: boolean;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  /**
   * file-service id of the reference image, when it came from an upload.
   * Stored as a REFERENCE asset so a retry can read it back (owner-checked by
   * file-service) instead of silently generating without it.
   */
  referenceFileId?: string;
};

/**
 * What `ImageExecutionManager.execute` needs for ONE attempt.
 *
 * Deliberately separate from `GenerateImageParams`, which is the shape a caller
 * ENQUEUES with. `requestId` cannot live on that shape: it identifies a single
 * paid attempt, and the same enqueued row is executed again by
 * `POST /images/:id/retry`.
 */
export type ExecuteImageInput = {
  prompt: string;
  provider: string;
  model: string;
  userId: string;
  /**
   * Idempotency key for the PAYG hold — one per PAID ATTEMPT.
   *
   * `reserve` is idempotent on `(userId, requestId)`, so reusing the generation
   * row id would make a retry settle a second real provider call against the
   * first attempt's hold and bill two calls as one. Required rather than
   * optional so a new call site cannot reach a paid provider without one.
   */
  requestId: string;
  width?: number;
  height?: number;
  quality?: string;
  style?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  /** Receives local-runtime progress (ComfyUI, SD WebUI) while the call runs. */
  onProgress?: ImageProgressCallback;
};

export type ImageProviderResponse = {
  imageUrl?: string;
  imageBase64?: string;
  revisedPrompt?: string;
  mimeType: string;
  width?: number;
  height?: number;
  /**
   * Measured token usage, when the provider reports any.
   *
   * Present for Gemini, which answers `:generateContent` with a `usageMetadata`
   * block exactly like a text call. ABSENT for OpenAI images: the
   * `/images/generations` response carries `created` and `data` and nothing
   * else — there is genuinely no usage to read, which is why OpenAI images are
   * priced per image (`imageUnits` on finalize) rather than per token.
   */
  usage?: TokenUsage;
};

export type GenerateImageResult = {
  fileId: string;
  revisedPrompt: string | null;
  latencyMs: number;
  /**
   * A paid attempt's hold, still OPEN: the caller settles it
   * (`ImageExecutionManager.settle`) only once the asset row is persisted, or
   * releases it (`releaseUnpersisted`) when that fails. Absent for a local
   * provider, which never touches the meter.
   */
  settlement?: ImageSettlement;
};

/** An open PAYG hold plus the units measured from the provider response. */
export type ImageSettlement = {
  hold: PaygHold;
  usage: PaygFinalizeUsage;
  calls: PaygFinalizeCalls;
};

/** What the provider produced, plus the open hold it will settle on (paid providers only). */
export type ImageProviderOutcome = {
  response: ImageProviderResponse;
  settlement?: ImageSettlement;
};

/**
 * What a failed generation stores and streams, once the cause has been told
 * apart from a plain provider error.
 */
export type ImageFailureDescription = {
  errorCode: string;
  errorMessage: string;
  /** Credit refused it. More attempts on PAID providers would be refused too. */
  isCreditFailure: boolean;
};

export type ConnectorConfigResponse = {
  provider: string;
  apiKey: string;
  baseUrl?: string;
};

export type StoreImageResponse = {
  fileId: string;
};

export type ImageGenerationEventPayload = {
  generationId: string;
  status: string;
  provider?: string;
  model?: string;
  progress?: number;
  assets?: Array<{
    id: string;
    url: string;
    downloadUrl: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    sizeBytes: number | null;
  }>;
  errorCode?: string | null;
  errorMessage?: string | null;
  /**
   * Set on the event that hands this job to another row. A listener switches
   * to that id; FAILED alongside it is not the end of the job.
   */
  supersededById?: string;
  /** Live runtime stage + observed metrics, on GENERATING events only. */
  runtimeProgress?: ImageProgressSnapshot;
};

export const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED'] as const;
