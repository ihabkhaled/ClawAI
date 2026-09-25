import { Injectable, Logger, Optional } from '@nestjs/common';

import { GEMINI_PROVIDER, VIDEO_MIME_PREFIX } from '../../../common/constants/execution.constants';
import { ModelCapabilityClient } from '../clients/model-capability.client';
import { AccessControlService } from '../services/access-control.service';
import type {
  AttachmentDeliveryPlan,
  AttachmentLaneTransport,
  VideoPlanGate,
} from '../types/attachment-delivery.types';
import type { AssembledContext } from '../types/context.types';
import type { FileDeliveryEntry } from '../types/file-delivery.types';
import type { VideoRoutingCapability } from '../types/model-capability.types';
import {
  countDeliveryModes,
  deliveryEntriesOf,
  laneSupportsVision,
  resolveAttachmentDelivery,
} from '../utilities/attachment-delivery.utility';
import { nativeAudioTokenBudget } from '../utilities/native-audio.utility';

/**
 * Decides, per lane, how every attachment reaches THAT lane's model — and
 * stamps the decision on the context the payload builders read (ADR-120).
 *
 * The selected conversational model is not assumed to be the media executor.
 * Its real capability comes from the connector catalog
 * (`ModelCapabilityClient`), and the one resulting plan drives BOTH the
 * provider payload (no `image_url` part for a lane that cannot see) and the
 * `FileDeliveryMode` provenance record, so the two cannot disagree.
 *
 * Called at the two execution chokepoints (`callProvider`, `streamCandidate`),
 * so single chat, every compare lane, the judge and the critic are each
 * resolved against their own model.
 */
@Injectable()
export class AttachmentDeliveryManager {
  private readonly logger = new Logger(AttachmentDeliveryManager.name);

  constructor(
    private readonly capabilities: ModelCapabilityClient,
    // Optional so hand-built specs keep their shape. Without it the video plan
    // is unknown, so no video ever rides natively (fails closed, ADR-122).
    @Optional() private readonly accessControl?: AccessControlService,
  ) {}

  /**
   * The context this lane's payload is built from. Unchanged when there are no
   * attachments or when the plan already belongs to this exact lane AND
   * transport. `transport.nativeMediaTransport: false` (a tool-carrying Gemini
   * turn, sent as the OpenAI-compatible body) resolves audio to its transcript
   * and video to frames + transcript, so the record matches what is sent.
   */
  async applyToContext(
    context: AssembledContext,
    provider: string,
    model: string,
    transport: AttachmentLaneTransport = { nativeMediaTransport: true },
  ): Promise<AssembledContext> {
    if (context.fileContents.length === 0) {
      return context;
    }
    const existing = context.attachmentDelivery;
    const sameLane =
      existing?.provider === provider &&
      existing.model === model &&
      (existing.nativeMediaTransport ?? true) === transport.nativeMediaTransport;
    return sameLane
      ? context
      : {
          ...context,
          attachmentDelivery: await this.plan(context, provider, model, transport),
        };
  }

  /** The provenance entries for one lane, without its payload flags. */
  async entriesFor(
    context: AssembledContext,
    provider: string,
    model: string,
  ): Promise<FileDeliveryEntry[]> {
    if (context.fileContents.length === 0) {
      return [];
    }
    const plan = await this.plan(context, provider, model);
    return deliveryEntriesOf(plan.decisions);
  }

  /** The catalog's answer for video routing (`resolveVideoAttachmentCandidates`). */
  async resolveVideoRouting(provider: string, model: string): Promise<VideoRoutingCapability> {
    const [capabilities, capableModels] = await Promise.all([
      this.capabilities.resolve(provider, model),
      this.capabilities.listVideoCapableModels(),
    ]);
    return { selected: capabilities.videoInput, capableModels };
  }

  /**
   * The uploader's `maxVideoSeconds` for native video, read only when a video
   * is attached to a lane that could carry it. An entitlements outage is
   * `available: false`: no bytes, the transcript path instead (fails closed).
   */
  private async videoPlan(context: AssembledContext): Promise<VideoPlanGate | undefined> {
    const hasVideo = context.fileContents.some((file) =>
      file.mimeType.toLowerCase().startsWith(VIDEO_MIME_PREFIX),
    );
    if (!hasVideo || this.accessControl === undefined || context.userId.length === 0) {
      return hasVideo ? { available: false, limitSeconds: null } : undefined;
    }
    try {
      return {
        available: true,
        limitSeconds: await this.accessControl.maxVideoSecondsFor(context.userId),
      };
    } catch (error: unknown) {
      this.logger.warn(
        `videoPlan: entitlements unavailable, no native video user=${context.userId} — ${error instanceof Error ? error.message : String(error)}`,
      );
      return { available: false, limitSeconds: null };
    }
  }

  private async plan(
    context: AssembledContext,
    provider: string,
    model: string,
    transport: AttachmentLaneTransport = { nativeMediaTransport: true },
  ): Promise<AttachmentDeliveryPlan> {
    const capabilities = await this.capabilities.resolve(provider, model);
    // Only Gemini's native request carries video or audio bytes today; every
    // other transport would have to decode them into the prompt, which is banned.
    // A tool-carrying Gemini turn goes out as the OpenAI-compatible body.
    const geminiTransport =
      provider.toUpperCase() === GEMINI_PROVIDER && transport.nativeMediaTransport;
    const decisions = resolveAttachmentDelivery(context.fileContents, capabilities, {
      provider,
      model,
      nativeVideoTransport: geminiTransport,
      videoPlan: geminiTransport ? await this.videoPlan(context) : undefined,
      nativeAudioTransport: geminiTransport,
      nativeAudioTokenBudget: nativeAudioTokenBudget(context.modelBudget),
    });
    // Structured, content-free: ids and counts only, never filenames or text.
    this.logger.log(
      `mediaDelivery ${JSON.stringify({
        provider,
        model,
        vision: capabilities.vision,
        videoInput: capabilities.videoInput,
        audioInput: capabilities.audioInput,
        files: decisions.length,
        modes: countDeliveryModes(decisions),
        fileIds: decisions.map((decision) => decision.fileId),
      })}`,
    );
    return {
      provider,
      model,
      nativeMediaTransport: transport.nativeMediaTransport,
      decisions,
      laneSeesImages: laneSupportsVision(provider, capabilities.vision),
    };
  }
}
