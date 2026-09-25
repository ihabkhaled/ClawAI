import type { RuntimeProgressStage } from '@claw/shared-types';

import type { ImageGenerationStatus } from '@/enums';

export type ImageGenerationAsset = {
  id: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
};

/**
 * Live stage of a local runtime (ComfyUI, Stable Diffusion WebUI), streamed on
 * GENERATING events. Only observed numbers: `progressPercent` is present only
 * when the runtime itself measured it.
 */
export type ImageRuntimeProgress = {
  stage: RuntimeProgressStage;
  currentStep?: number;
  totalSteps?: number;
  elapsedMs?: number;
  progressPercent?: number;
};

/** The head of a supersession chain, as `GET /images/:id` resolves it. */
export type ImageGenerationLatest = {
  id: string;
  status: ImageGenerationStatus;
  provider: string;
  model: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  supersededById?: string | null;
  assets: ImageGenerationAsset[];
};

export type ImageGeneration = {
  id: string;
  status: ImageGenerationStatus;
  provider: string;
  model: string;
  prompt: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  assets: ImageGenerationAsset[];
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** The row an AUTO fallback or a retry-alternate continued this job on. */
  supersededById?: string | null;
  /** What the user actually got: the newest row in this job's chain. */
  latest?: ImageGenerationLatest | null;
  /** Client-side only: the last runtime stage the stream reported. */
  runtimeProgress?: ImageRuntimeProgress | null;
};

export type ImageGenerationEventPayload = {
  generationId: string;
  status: ImageGenerationStatus;
  provider?: string;
  model?: string;
  progress?: number;
  assets?: ImageGenerationAsset[];
  errorCode?: string | null;
  errorMessage?: string | null;
  /** This job moved to another row; follow it. A FAILED status alongside is not the end. */
  supersededById?: string;
  runtimeProgress?: ImageRuntimeProgress;
};

/** Which row the listener is following for a given card, and how many hops it took. */
export type ImageGenerationFollowState = {
  rootId: string | undefined;
  trackedId: string | undefined;
};

/** `POST /images/:id/retry` and `POST /images/:id/cancel` answer: the row acted on and its status after the call. */
export type ImageGenerationActionResult = {
  generationId: string;
  status: ImageGenerationStatus;
};
