import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
import { HelperExecutionKind } from '../../../common/enums/helper-execution-kind.enum';
import { VideoFrameDelivery } from '../../../common/enums/video-frame-delivery.enum';
import { VisionHelperOutcome } from '../../../common/enums/vision-helper-outcome.enum';
import {
  DELIVERY_REASON_VIDEO_FRAMES_HELPER_PLAN,
  DELIVERY_REASON_VIDEO_FRAMES_NO_HELPER,
  DELIVERY_REASON_VIDEO_FRAMES_UNAVAILABLE,
  DELIVERY_REASON_VISION_HELPER_FAILED,
  DELIVERY_REASON_VISION_HELPER_LIMIT,
  DELIVERY_REASON_VISION_HELPER_REFUSED,
} from '../constants/attachment-delivery.constants';
import { FILE_FIT_BUDGET_SHARE } from '../constants/evidence-fit.constants';
import {
  VIDEO_BLOCK_FRAMING_CHARS,
  VIDEO_FRAME_FRAMING_CHARS,
  VIDEO_FRAME_IMAGE_TOKENS,
} from '../constants/video-delivery.constants';
import type {
  AttachmentDeliveryDecision,
  AttachmentDeliveryPlan,
} from '../types/attachment-delivery.types';
import type { AssembledContext } from '../types/context.types';
import type {
  VideoFrameImage,
  VideoFrameObservation,
  VideoFrameSet,
  VideoLaneOutcome,
} from '../types/video-delivery.types';
import type {
  DerivedImageObservation,
  HelperExecution,
  VideoFrameDescriptionBatch,
} from '../types/vision-helper.types';
import { videoFrameKey } from './video-context.utility';
import { fitLaneFileShare } from './vision-helper.utility';

/** The videos this lane gets as frames + transcript, in attachment order. */
export function videoFrameDecisions(plan: AttachmentDeliveryPlan): AttachmentDeliveryDecision[] {
  return plan.decisions.filter(
    (decision) => decision.mode === FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
  );
}

/** Images the vision helper already took on for this lane — they spend the per-turn cap first. */
export function imagesAttemptedByHelper(plan: AttachmentDeliveryPlan): number {
  return new Set(
    (plan.helperExecutions ?? [])
      .filter((execution) => execution.kind === HelperExecutionKind.VISION)
      .map((execution) => execution.fileId),
  ).size;
}

/**
 * How many native frames a seeing lane may take (rule 51 item 4): images are
 * prompt tokens too, so they spend half the file share at
 * `VIDEO_FRAME_IMAGE_TOKENS` each — an 8k local vision model gets one frame, a
 * 128k model the full sample. Never zero: one frame always fits.
 */
export function nativeFrameCap(modelBudget: AssembledContext['modelBudget']): number {
  const inputTokens = Math.max(
    0,
    modelBudget.contextWindowTokens - modelBudget.reservedOutputTokens,
  );
  return Math.max(
    1,
    Math.floor((inputTokens * FILE_FIT_BUDGET_SHARE) / 2 / VIDEO_FRAME_IMAGE_TOKENS),
  );
}

/** The last thing the user asked — what the frame timestamps are chosen for. */
export function currentQuestion(context: Pick<AssembledContext, 'threadMessages'>): string {
  const messages = context.threadMessages;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'USER') {
      return message.content;
    }
  }
  return '';
}

/** A frame set that carries no frames, only the reason the lane used the transcript alone. */
export function transcriptOnlySet(
  fileId: string,
  filename: string,
  timestampsMs: readonly number[],
  reason: string,
): VideoFrameSet {
  return {
    fileId,
    filename,
    timestampsMs: [...timestampsMs],
    frameDelivery: VideoFrameDelivery.NONE,
    frames: [],
    observations: [],
    reason,
  };
}

/** A seeing lane: every fetched frame rides the payload as an image. */
export function nativeFrameSet(
  fileId: string,
  filename: string,
  frames: readonly VideoFrameImage[],
): VideoFrameSet {
  return {
    fileId,
    filename,
    timestampsMs: frames.map((frame) => frame.timestampMs),
    frameDelivery: VideoFrameDelivery.NATIVE_IMAGES,
    frames: [...frames],
    observations: [],
  };
}

/**
 * A blind lane: the helper's batch → the frame set. Successful descriptions
 * become timestamped observations; with none, the lane is on the transcript
 * and the reason says why (plan, no helper, credit refusal, failure).
 */
export function describedFrameSet(
  fileId: string,
  filename: string,
  timestampsMs: readonly number[],
  batch: VideoFrameDescriptionBatch,
): VideoFrameSet {
  const observations: VideoFrameObservation[] = batch.results.flatMap((result) => {
    const observation = result.observation;
    const timestampMs = timestampFromKey(fileId, result.fileId);
    return observation === undefined || timestampMs === null
      ? []
      : [
          {
            timestampMs,
            helperProvider: observation.helperProvider,
            helperModel: observation.helperModel,
            text: observation.text,
          },
        ];
  });
  return observations.length > 0 ? {
      fileId,
      filename,
      timestampsMs: observations.map((observation) => observation.timestampMs),
      frameDelivery: VideoFrameDelivery.HELPER_OBSERVATIONS,
      frames: [],
      observations: observations.sort((a, b) => a.timestampMs - b.timestampMs),
    } : transcriptOnlySet(fileId, filename, timestampsMs, noObservationReason(batch));
}

function noObservationReason(batch: VideoFrameDescriptionBatch): string {
  if (batch.onPlan === false) {
    return DELIVERY_REASON_VIDEO_FRAMES_HELPER_PLAN;
  }
  if (!batch.helperAvailable) {
    return DELIVERY_REASON_VIDEO_FRAMES_NO_HELPER;
  }
  if (!batch.framesLoaded) {
    return DELIVERY_REASON_VIDEO_FRAMES_UNAVAILABLE;
  }
  return batch.results.some((result) => result.outcome === VisionHelperOutcome.REFUSED)
    ? DELIVERY_REASON_VISION_HELPER_REFUSED
    : DELIVERY_REASON_VISION_HELPER_FAILED;
}

function timestampFromKey(fileId: string, key: string): number | null {
  const prefix = `${fileId}@`;
  if (!key.startsWith(prefix)) {
    return null;
  }
  const value = Number(key.slice(prefix.length));
  return Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * The lane's file text after frame descriptions joined it, fitted to ONE
 * budget — the window's file share (rule 51 item 4). Image descriptions,
 * frame descriptions and every file's extracted text (the video transcripts
 * included) are fitted together, descriptions first, so the total never
 * exceeds the share the files had before. A frame whose description no longer
 * fits is dropped from its set; a set left with none says so.
 */
export function fitVideoObservations(
  context: Pick<AssembledContext, 'modelBudget' | 'fileContents'>,
  plan: AttachmentDeliveryPlan,
  sets: readonly VideoFrameSet[],
): {
  fileContents: AssembledContext['fileContents'];
  derivedImages: DerivedImageObservation[];
  sets: VideoFrameSet[];
} {
  const images = plan.derivedImages ?? [];
  const frameObservations: DerivedImageObservation[] = sets.flatMap((set) =>
    set.observations.map((observation) => ({
      fileId: videoFrameKey(set.fileId, observation.timestampMs),
      filename: set.filename,
      helperProvider: observation.helperProvider,
      helperModel: observation.helperModel,
      text: observation.text,
    })),
  );
  if (frameObservations.length === 0) {
    return { fileContents: context.fileContents, derivedImages: [...images], sets: [...sets] };
  }
  const framing =
    frameObservations.length * VIDEO_FRAME_FRAMING_CHARS + sets.length * VIDEO_BLOCK_FRAMING_CHARS;
  const fit = fitLaneFileShare(context, [...images, ...frameObservations], framing);
  const fittedImages = fit.derivedImages.slice(0, images.length);
  const fittedFrames = new Map(
    fit.derivedImages
      .slice(images.length)
      .map((observation) => [observation.fileId, observation.text]),
  );
  return {
    fileContents: fit.fileContents,
    derivedImages: fittedImages,
    sets: sets.map((set) => refitSet(set, fittedFrames)),
  };
}

function refitSet(set: VideoFrameSet, fitted: ReadonlyMap<string, string>): VideoFrameSet {
  if (set.frameDelivery !== VideoFrameDelivery.HELPER_OBSERVATIONS) {
    return set;
  }
  const observations = set.observations.flatMap((observation) => {
    const text = fitted.get(videoFrameKey(set.fileId, observation.timestampMs));
    return text === undefined ? [] : [{ ...observation, text }];
  });
  return observations.length > 0
    ? {
        ...set,
        observations,
        timestampsMs: observations.map((observation) => observation.timestampMs),
      }
    : transcriptOnlySet(
        set.fileId,
        set.filename,
        set.timestampsMs,
        DELIVERY_REASON_VISION_HELPER_LIMIT,
      );
}

/**
 * The lane's plan after its videos' frames were resolved: each video's entry
 * records the frame delivery, the timestamps that reached the lane and, for
 * described frames, the helper; frame helper calls join
 * `helperExecutions` as `VIDEO_FRAME`.
 */
export function applyVideoOutcomes(
  plan: AttachmentDeliveryPlan,
  outcomes: readonly VideoLaneOutcome[],
  sets: readonly VideoFrameSet[],
  derivedImages: readonly DerivedImageObservation[],
): AttachmentDeliveryPlan {
  const byFile = new Map(sets.map((set) => [set.fileId, set]));
  const frameExecutions: HelperExecution[] = outcomes.flatMap(
    (outcome) => outcome.helperExecutions,
  );
  const helperExecutions = [...(plan.helperExecutions ?? []), ...frameExecutions];
  return {
    ...plan,
    decisions: plan.decisions.map((decision) => {
      const set = byFile.get(decision.fileId);
      return set === undefined ? decision : withFrameSet(decision, set);
    }),
    ...(plan.derivedImages === undefined ? {} : { derivedImages: [...derivedImages] }),
    ...(helperExecutions.length > 0 ? { helperExecutions } : {}),
    videoFrames: [...sets],
  };
}

function withFrameSet(
  decision: AttachmentDeliveryDecision,
  set: VideoFrameSet,
): AttachmentDeliveryDecision {
  const { reason: _reason, helperProvider: _provider, helperModel: _model, ...rest } = decision;
  const helper = set.observations.at(0);
  return {
    ...rest,
    frameDelivery: set.frameDelivery,
    frameTimestampsMs: [...set.timestampsMs],
    ...(helper === undefined
      ? {}
      : { helperProvider: helper.helperProvider, helperModel: helper.helperModel }),
    ...(set.reason === undefined ? {} : { reason: set.reason }),
  };
}
