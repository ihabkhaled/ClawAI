import { Injectable, Logger } from '@nestjs/common';

import { type ChatMessage } from '../../../generated/prisma';
import { type AssembledContext } from '../types/context.types';
import { type LlmResponse } from '../types/execution.types';
import { type ModeExecutionRequest } from '../types/mode-execution-gateway.types';
import { ChatExecutionManager } from './chat-execution.manager';

/**
 * How an orchestration mode calls a model.
 *
 * Every lab mode used to build an `OllamaGenerateRequest` by hand and post it
 * straight to `/api/v1/ollama/generate`. That had three consequences nobody
 * chose:
 *
 *  - **Local only.** A lab run could use no connector, so an account with a
 *    Gemini key and no local model could not run Best-of-N at all, and no lab
 *    run could ever use the model the router would have picked.
 *  - **A different request shape.** The chat path builds provider-native bodies
 *    — Anthropic's system split, Gemini's native form, tool turns, multimodal
 *    parts — and none of that reached a lab mode.
 *  - **Two accounting paths.** The modes metered through
 *    `meterOrchestrationCall` while chat metered inside `callProvider`; the
 *    same question asked twice was priced by two different code paths.
 *
 * They were metered, to be clear — this is not a billing hole. It is one
 * mechanism where there should be one.
 *
 * This manager routes a mode through `ChatExecutionManager.callProvider`, the
 * same chokepoint chat uses, so the hold, the ceiling, the release-on-error and
 * the token ledger are shared rather than reimplemented.
 */
@Injectable()
export class ModeExecutionGatewayManager {
  private readonly logger = new Logger(ModeExecutionGatewayManager.name);

  constructor(private readonly chatExecutionManager: ChatExecutionManager) {}

  async run(request: ModeExecutionRequest): Promise<LlmResponse> {
    const context = this.withPrompt(request.bundle.context, request.prompt);

    this.logger.debug(
      `run: ${request.provider}/${request.model} ledger=${request.ledgerContext} ` +
        `history=${String(context.threadMessages.length)} ` +
        `files=${String(context.fileContents.length)} ` +
        `memories=${String(context.memories.length)}`,
    );

    return this.chatExecutionManager.callProvider(
      request.provider,
      request.model,
      context,
      Date.now(),
      false,
      request.bundle.threadSettings,
      request.routingMode,
      request.executionOptions,
      request.ledgerContext,
      request.paygCall,
    );
  }

  /**
   * Appends the mode's question as a user turn.
   *
   * Appending, not replacing. A sub-task, a pipeline stage's input or a
   * verifier's question is not something the user typed, but the conversation
   * before it is still the context that makes the answer correct — and
   * replacing `threadMessages` is exactly the mistake that left the judge
   * unable to see the question it was judging.
   */
  private withPrompt(context: AssembledContext, prompt: string | undefined): AssembledContext {
    if (prompt === undefined || prompt.trim().length === 0) {
      return context;
    }
    // The mode's prompt is often the user's own request, which is already the
    // last user row (spelled out by the gateway for an attachment-only send).
    const last = context.threadMessages.at(-1);
    if (last?.role === 'USER' && last.content.trim() === prompt.trim()) {
      return context;
    }
    const synthetic = {
      id: `mode-prompt-${String(context.threadMessages.length)}`,
      threadId: context.threadMessages.at(-1)?.threadId ?? '',
      role: 'USER',
      content: prompt,
      metadata: null,
    } as unknown as ChatMessage;

    return { ...context, threadMessages: [...context.threadMessages, synthetic] };
  }
}
