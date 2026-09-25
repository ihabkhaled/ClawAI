import { Injectable, Logger } from '@nestjs/common';

import { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';
import { VIDEO_MIME_PREFIX } from '../../../common/constants/execution.constants';
import { VideoFramesClient } from '../clients/video-frames.client';
import {
  DELIVERY_REASON_VIDEO_FRAMES_UNAVAILABLE,
  DELIVERY_REASON_VISION_HELPER_LIMIT,
} from '../constants/attachment-delivery.constants';
import {
  VIDEO_FRAMES_RESULT_CACHE_MAX_ENTRIES,
  VIDEO_FRAMES_RESULT_TTL_MS,
} from '../constants/video-delivery.constants';
import { VISION_HELPER_MAX_IMAGES_PER_TURN } from '../constants/vision-helper.constants';
import type {
  AttachmentDeliveryDecision,
  AttachmentDeliveryPlan,
} from '../types/attachment-delivery.types';
import type { AssembledContext, FileContentResponse } from '../types/context.types';
import type {
  VideoDeliveryLogFields,
  VideoDeliveryLogLine,
  VideoFrameImage,
  VideoFramesCacheEntry,
  VideoFramesFetchResult,
  VideoLaneOutcome,
} from '../types/video-delivery.types';
import type { VisionHelperInvoker } from '../types/vision-helper.types';
import {
  applyVideoOutcomes,
  currentQuestion,
  describedFrameSet,
  fitVideoObservations,
  imagesAttemptedByHelper,
  nativeFrameCap,
  nativeFrameSet,
  transcriptOnlySet,
  videoFrameDecisions,
} from '../utilities/video-delivery.utility';
import {
  allocateTurnFrames,
  pickEvenly,
  selectVideoFrameTimestamps,
} from '../utilities/video-frame-selection.utility';
import { VisionHelperManager } from './vision-helper.manager';

/**
 * Video for a lane that cannot watch it natively (multimodal batch 8,
 * strategy HYBRID). The resolver already gave such a video
 * VIDEO_FRAMES_AND_TRANSCRIPT because its timestamped document exists; this
 * adds the sampled frames:
 *
 *   - a lane that can SEE gets the frames as image parts, each labelled with
 *     its timestamp;
 *   - a lane that cannot see gets the VISION_HELPER role's description of each
 *     frame (plan-gated, metered, one description per frame per turn), framed
 *     as timestamped derived observations;
 *   - otherwise the transcript alone, with an honest note — never silence.
 *
 * Frames are fetched from file-service ONCE per (user, turn, video) and shared
 * by every compare lane, the judge and the critic of the turn. A frames
 * failure never breaks the turn: the lane degrades to transcript-only.
 */
@Injectable()
export class VideoDeliveryManager {
  private readonly logger = new Logger(VideoDeliveryManager.name);
  private readonly fetches = new Map<string, VideoFramesCacheEntry>();

  constructor(
    private readonly framesClient: VideoFramesClient,
    private readonly visionHelper: VisionHelperManager,
  ) {}

  /** The lane's context with its videos' frames resolved, or unchanged when there are none. */
  async upgradeContext(
    context: AssembledContext,
    invoke: VisionHelperInvoker,
  ): Promise<AssembledContext> {
    const plan = context.attachmentDelivery;
    if (plan === undefined || plan.videoFrames !== undefined || context.visionHelperCall === true) {
      return context;
    }
    this.logOtherVideos(plan);
    const videos = videoFrameDecisions(plan);
    if (videos.length === 0) {
      return context;
    }
    const allocation = allocateTurnFrames(videos.length);
    const question = currentQuestion(context);
    let helperBudget = Math.max(
      0,
      VISION_HELPER_MAX_IMAGES_PER_TURN - imagesAttemptedByHelper(plan),
    );
    const outcomes: VideoLaneOutcome[] = [];
    // Sequential on purpose: the per-turn helper cap is spent in attachment
    // order, so every lane of the turn describes the same frames.
    for (const [index, decision] of videos.entries()) {
      const outcome = await this.resolveVideo(context, plan, decision, {
        maxFrames: allocation[index] ?? 0,
        helperBudget,
        question,
        invoke,
      });
      helperBudget -= outcome.helperFramesAttempted;
      outcomes.push(outcome);
    }
    const fit = fitVideoObservations(
      context,
      plan,
      outcomes.map((outcome) => outcome.frameSet),
    );
    const upgraded = applyVideoOutcomes(plan, outcomes, fit.sets, fit.derivedImages);
    for (const [index, set] of fit.sets.entries()) {
      this.log(plan, {
        fileId: set.fileId,
        strategy: FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT,
        frameDelivery: set.frameDelivery,
        frames: set.frames.length + set.observations.length,
        latencyMs: outcomes[index]?.latencyMs ?? 0,
        reason: set.reason ?? null,
      });
    }
    return { ...context, fileContents: fit.fileContents, attachmentDelivery: upgraded };
  }

  private async resolveVideo(
    context: AssembledContext,
    plan: AttachmentDeliveryPlan,
    decision: AttachmentDeliveryDecision,
    options: {
      maxFrames: number;
      helperBudget: number;
      question: string;
      invoke: VisionHelperInvoker;
    },
  ): Promise<VideoLaneOutcome> {
    const started = Date.now();
    const file = context.fileContents.find((candidate) => candidate.id === decision.fileId);
    const durationMs = file?.media?.durationMs ?? null;
    const timestamps =
      durationMs === null
        ? []
        : selectVideoFrameTimestamps(durationMs, options.question, options.maxFrames);
    if (file === undefined || timestamps.length === 0) {
      return this.outcome(
        transcriptOnlySet(
          decision.fileId,
          decision.filename,
          [],
          DELIVERY_REASON_VIDEO_FRAMES_UNAVAILABLE,
        ),
        started,
      );
    }
    if (plan.laneSeesImages === true) {
      const fetched = await this.fetchOnce(context, file.id, timestamps);
      return this.outcome(
        fetched.ok
          ? nativeFrameSet(
              file.id,
              file.filename,
              pickEvenly(fetched.frames, nativeFrameCap(context.modelBudget)),
            )
          : transcriptOnlySet(
              file.id,
              file.filename,
              timestamps,
              DELIVERY_REASON_VIDEO_FRAMES_UNAVAILABLE,
            ),
        started,
      );
    }
    return this.describeForBlindLane(context, file, timestamps, options, started);
  }

  /** A lane that cannot see: the helper describes up to the remaining per-turn cap. */
  private async describeForBlindLane(
    context: AssembledContext,
    file: FileContentResponse,
    timestamps: readonly number[],
    options: { helperBudget: number; invoke: VisionHelperInvoker },
    started: number,
  ): Promise<VideoLaneOutcome> {
    if (options.helperBudget <= 0) {
      return this.outcome(
        transcriptOnlySet(file.id, file.filename, timestamps, DELIVERY_REASON_VISION_HELPER_LIMIT),
        started,
      );
    }
    let handed = 0;
    const loadFrames = async (): Promise<readonly VideoFrameImage[]> => {
      const fetched = await this.fetchOnce(context, file.id, timestamps);
      const frames = fetched.ok ? pickEvenly(fetched.frames, options.helperBudget) : [];
      handed = frames.length;
      return frames;
    };
    const batch = await this.visionHelper.describeVideoFrames(
      context,
      file,
      loadFrames,
      options.invoke,
    );
    return {
      frameSet: describedFrameSet(file.id, file.filename, timestamps, batch),
      helperExecutions: batch.results.flatMap((result) => result.executions),
      helperFramesAttempted: handed,
      latencyMs: Date.now() - started,
    };
  }

  /** The turn's one frames request for this video, shared by every lane. */
  private async fetchOnce(
    context: AssembledContext,
    fileId: string,
    timestamps: readonly number[],
  ): Promise<VideoFramesFetchResult> {
    const now = Date.now();
    this.evict(now);
    if (context.turnId === undefined) {
      return this.framesClient.fetchFrames(fileId, context.userId, timestamps);
    }
    const key = `${context.userId}:${context.turnId}:${fileId}:${timestamps.join(',')}`;
    const hit = this.fetches.get(key);
    if (hit !== undefined) {
      return hit.result;
    }
    const result = this.framesClient.fetchFrames(fileId, context.userId, timestamps);
    this.fetches.set(key, { result, expiresAt: now + VIDEO_FRAMES_RESULT_TTL_MS });
    return result;
  }

  private outcome(frameSet: VideoLaneOutcome['frameSet'], started: number): VideoLaneOutcome {
    return {
      frameSet,
      helperExecutions: [],
      helperFramesAttempted: 0,
      latencyMs: Date.now() - started,
    };
  }

  /** Native / processing / failed videos get the same content-free line, with no frames. */
  private logOtherVideos(plan: AttachmentDeliveryPlan): void {
    for (const decision of plan.decisions) {
      const isVideo = decision.mimeType.toLowerCase().startsWith(VIDEO_MIME_PREFIX);
      if (isVideo && decision.mode !== FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT) {
        this.log(plan, {
          fileId: decision.fileId,
          strategy: decision.mode,
          frameDelivery: null,
          frames: 0,
          latencyMs: 0,
          reason: decision.reason ?? null,
        });
      }
    }
  }

  /** Content-free: ids, counts and timings only — never transcript text or frames. */
  private log(plan: AttachmentDeliveryPlan, line: VideoDeliveryLogFields): void {
    const entry: VideoDeliveryLogLine = { provider: plan.provider, model: plan.model, ...line };
    this.logger.log(`videoDelivery ${JSON.stringify(entry)}`);
  }

  private evict(now: number): void {
    for (const [key, entry] of this.fetches) {
      if (entry.expiresAt <= now || this.fetches.size > VIDEO_FRAMES_RESULT_CACHE_MAX_ENTRIES) {
        this.fetches.delete(key);
      }
    }
  }
}
