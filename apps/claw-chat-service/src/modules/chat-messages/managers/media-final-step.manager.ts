import { Injectable, Logger, Optional } from '@nestjs/common';
import { type TokenLedgerContext } from '@claw/shared-types';
import { modelCanCallMediaTools } from '@claw/shared-utilities';

import {
  MEDIA_CLAIM_REMOVED_TEXT,
  MEDIA_FINAL_STEP_NOTE,
  MEDIA_STOPPED_TEXT,
} from '../constants/media-tools.constants';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { StreamCancellationService } from '../services/stream-cancellation.service';
import { linkMedia } from '../utilities/media-gateway.utility';
import { MediaToolLoopManager } from './media-tool-loop.manager';
import type { AdvancedModelSelectionResolution } from '../types/advanced-model-selection.types';
import type { ChatContextBundle } from '../types/chat-context-gateway.types';
import type { AssembledContext } from '../types/context.types';
import type { ThreadSettings } from '../types/execution.types';
import type { MediaFinalStepResult } from '../types/media-tools.types';
import { claimsMedia, stripMediaClaims } from '../utilities/media-claim.utility';
import { asksToCreateMedia } from '../utilities/media-tool-eligibility.utility';
import { latestUserTurnText } from '../utilities/quoted-turn.utility';
import { ChatExecutionManager } from './chat-execution.manager';

/**
 * Media for the orchestration surfaces that produce MANY candidate answers (Consensus, Best-of-N,
 * Cost-Ensemble, Role Pack, Decompose, Pipeline, Escalation).
 *
 * Their candidates and sub-steps never get the media tools: N candidates would each pay for the
 * same picture. Instead the step that produces the ONE user-visible answer calls `finalize` once.
 * If (and only if) the user asked to create media and the answering model can call the tools, one
 * extra metered call runs the shared media tool loop on that model with the prepared answer as
 * background; the media rides back on the final message. Otherwise nothing is spent and the
 * answer is only cleaned of any "I generated an image" claim no tool result backs.
 */
@Injectable()
export class MediaFinalStepManager {
  private readonly logger = new Logger(MediaFinalStepManager.name);

  /** The Stop controller of each orchestrated turn in flight on this replica, by thread. */
  private readonly turns = new Map<string, AbortController>();

  constructor(
    private readonly chatExecutionManager: ChatExecutionManager,
    @Optional() private readonly mediaToolLoop?: MediaToolLoopManager,
    @Optional() private readonly chatThreadsRepository?: ChatThreadsRepository,
    @Optional() private readonly cancellation?: StreamCancellationService,
  ) {}

  /**
   * Runs a whole orchestrated turn (candidates and final step) under the thread's Stop key, so
   * `POST .../stream/:threadId/cancel` reaches it. The final step checks the controller and
   * saves "stopped" instead of making media; an in-flight media job is cancelled by the loop.
   */
  async runScoped<T>(threadId: string, work: () => Promise<T>): Promise<T> {
    const controller = this.cancellation?.register(threadId);
    if (controller !== undefined) this.turns.set(threadId, controller);
    try {
      return await work();
    } finally {
      if (controller !== undefined) {
        this.turns.delete(threadId);
        this.cancellation?.release(threadId);
      }
    }
  }

  /** Links the media a final step made to the message that was saved for it (image, video, audio). */
  async linkSaved(
    final: MediaFinalStepResult | undefined,
    threadId: string,
    messageId: string,
  ): Promise<void> {
    const media = final?.mediaGenerations ?? [];
    if (media.length === 0 || this.chatThreadsRepository === undefined) return;
    try {
      const thread = await this.chatThreadsRepository.findById(threadId);
      if (thread === null) return;
      await Promise.all(media.map((ref) => linkMedia(ref.kind, ref.id, thread.userId, messageId)));
    } catch (error: unknown) {
      this.logger.warn(
        `linkSaved: not linked - ${error instanceof Error ? error.message : 'error'}`,
      );
    }
  }

  async finalize(input: {
    context: AssembledContext;
    threadSettings: ThreadSettings | undefined;
    provider: string;
    model: string;
    routingMode?: string | undefined;
    ledgerContext: TokenLedgerContext;
    answer: string;
  }): Promise<MediaFinalStepResult> {
    const { context, provider, model, answer } = input;
    const threadId = context.threadMessages.at(-1)?.threadId ?? '';
    const stopSignal = this.turns.get(threadId)?.signal;
    // Stop pressed during the turn: the saved message says so; no media, no synthesis text.
    if (stopSignal?.aborted === true) return { content: MEDIA_STOPPED_TEXT };
    const userText = latestUserTurnText(context.threadMessages) ?? '';
    // A turn that did not ask for media is left exactly as the orchestration produced it.
    if (!asksToCreateMedia(userText)) return { content: answer };
    const clean = this.withoutClaims(answer);
    if (!modelCanCallMediaTools(provider, model)) {
      return this.directMedia(context, clean, stopSignal);
    }
    try {
      const response = await this.chatExecutionManager.callProvider(
        provider,
        model,
        this.finalStepContext(context, answer),
        Date.now(),
        false,
        input.threadSettings,
        input.routingMode,
        undefined,
        input.ledgerContext,
      );
      const media = response.mediaGenerations ?? [];
      if (media.length === 0) return { content: clean };
      return {
        content: response.content.trim().length > 0 ? response.content : clean,
        mediaGenerations: media,
      };
    } catch (error: unknown) {
      // The media step never costs the user the answer the orchestration already produced.
      this.logger.warn(
        `finalize: media step failed, keeping the answer - ${error instanceof Error ? error.message : 'error'}`,
      );
      return { content: clean };
    }
  }

  /**
   * The answering model cannot call tools (Ollama, any non-tool provider): the media is made
   * directly from the user's request, once, so those labs are not left without media.
   */
  private async directMedia(
    context: AssembledContext,
    clean: string,
    signal: AbortSignal | undefined,
  ): Promise<MediaFinalStepResult> {
    if (this.mediaToolLoop === undefined) return { content: clean };
    try {
      const direct = await this.mediaToolLoop.generateDirect(context, signal);
      if (direct.cancelled) return { content: MEDIA_STOPPED_TEXT };
      return direct.generations.length === 0
        ? { content: clean }
        : { content: clean, mediaGenerations: direct.generations };
    } catch (error: unknown) {
      this.logger.warn(
        `directMedia: failed, keeping the answer - ${error instanceof Error ? error.message : 'error'}`,
      );
      return { content: clean };
    }
  }

  /** `finalize` for the modes that hold a context bundle and a resolved model selection. */
  finalizeForBundle(
    bundle: ChatContextBundle,
    selection: AdvancedModelSelectionResolution,
    ledgerContext: TokenLedgerContext,
    answer: string,
  ): Promise<MediaFinalStepResult> {
    return this.finalize({
      context: bundle.context,
      threadSettings: bundle.threadSettings,
      provider: selection.actualProvider,
      model: selection.actualModel,
      routingMode: selection.modelSelectionMode,
      ledgerContext,
      answer,
    });
  }

  private finalStepContext(context: AssembledContext, answer: string): AssembledContext {
    const note = `${MEDIA_FINAL_STEP_NOTE}\n<prepared_answer>\n${answer}\n</prepared_answer>`;
    const existing = context.systemPrompt;
    return {
      ...context,
      mediaFinalStep: true,
      systemPrompt: existing === null || existing.length === 0 ? note : `${existing}\n\n${note}`,
    };
  }

  private withoutClaims(answer: string): string {
    if (!claimsMedia(answer)) return answer;
    const stripped = stripMediaClaims(answer);
    return stripped.length > 0 ? stripped : MEDIA_CLAIM_REMOVED_TEXT;
  }
}
