import { Injectable, Logger } from '@nestjs/common';

import { GEMINI_PROVIDER } from '../../../common/constants/execution.constants';
import { ModelCapabilityClient } from '../clients/model-capability.client';
import type { AttachmentDeliveryPlan } from '../types/attachment-delivery.types';
import type { AssembledContext } from '../types/context.types';
import type { FileDeliveryEntry } from '../types/file-delivery.types';
import type { VideoRoutingCapability } from '../types/model-capability.types';
import {
  countDeliveryModes,
  deliveryEntriesOf,
  resolveAttachmentDelivery,
} from '../utilities/attachment-delivery.utility';

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

  constructor(private readonly capabilities: ModelCapabilityClient) {}

  /**
   * The context this lane's payload is built from. Unchanged when there are no
   * attachments or when the plan already belongs to this exact lane.
   */
  async applyToContext(
    context: AssembledContext,
    provider: string,
    model: string,
  ): Promise<AssembledContext> {
    if (context.fileContents.length === 0) {
      return context;
    }
    const existing = context.attachmentDelivery;
    return existing?.provider === provider && existing.model === model
      ? context
      : { ...context, attachmentDelivery: await this.plan(context, provider, model) };
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

  private async plan(
    context: AssembledContext,
    provider: string,
    model: string,
  ): Promise<AttachmentDeliveryPlan> {
    const capabilities = await this.capabilities.resolve(provider, model);
    const decisions = resolveAttachmentDelivery(context.fileContents, capabilities, {
      provider,
      model,
      // Only Gemini's native request carries video bytes today; every other
      // transport would have to decode them into the prompt, which is banned.
      nativeVideoTransport: provider.toUpperCase() === GEMINI_PROVIDER,
    });
    // Structured, content-free: ids and counts only, never filenames or text.
    this.logger.log(
      `mediaDelivery ${JSON.stringify({
        provider,
        model,
        vision: capabilities.vision,
        videoInput: capabilities.videoInput,
        files: decisions.length,
        modes: countDeliveryModes(decisions),
        fileIds: decisions.map((decision) => decision.fileId),
      })}`,
    );
    return { provider, model, decisions };
  }
}
