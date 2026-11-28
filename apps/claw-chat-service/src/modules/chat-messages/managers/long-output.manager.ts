import { Injectable, Logger } from '@nestjs/common';

import { NarrationKind } from '../../../common/enums/narration-kind.enum';
import {
  LONG_OUTPUT_CONTINUE_NOTE,
  LONG_OUTPUT_LENGTH_FINISH_REASONS,
  LONG_OUTPUT_MAX_ROUNDS,
} from '../constants/long-input.constants';
import { NarrationService } from '../services/narration.service';
import type { ChatMessage } from '../../../generated/prisma';
import type { LlmResponse } from '../types/execution.types';
import type { LongOutputRequest } from '../types/long-input.types';
import { withContextSaveNote } from '../utilities/context-save-note.utility';
import { ChatExecutionManager } from './chat-execution.manager';

/**
 * An answer cut by the output limit is continued (ADR-231): the partial answer goes back as the model's own turn with
 * a note to carry on exactly where it stopped, up to LONG_OUTPUT_MAX_ROUNDS times, and the pieces are joined into one
 * stored answer. Each continuation streams to the same live answer and is metered like any call. A stop ends it.
 */
@Injectable()
export class LongOutputManager {
  private readonly logger = new Logger(LongOutputManager.name);

  constructor(
    private readonly execution: ChatExecutionManager,
    private readonly narration: NarrationService,
  ) {}

  isCut(response: LlmResponse): boolean {
    return (
      response.finishReason !== undefined &&
      LONG_OUTPUT_LENGTH_FINISH_REASONS.has(response.finishReason) &&
      response.content.trim().length > 0
    );
  }

  async complete(input: LongOutputRequest): Promise<LlmResponse> {
    let joined = input.response;
    for (let round = 1; round <= LONG_OUTPUT_MAX_ROUNDS && this.isCut(joined); round += 1) {
      await this.narration.append(input.payload.threadId, {
        kind: NarrationKind.LONG_OUTPUT,
        params: { part: round + 1 },
      });
      const next = await this.execution.execute(
        input.payload,
        this.continuationContext(input, joined.content),
        input.threadSettings,
        undefined,
      );
      if (next.finishReason === 'cancelled' || next.content.length === 0) {
        joined = { ...joined, finishReason: next.finishReason ?? joined.finishReason };
        break;
      }
      joined = this.join(joined, next);
      this.logger.log(
        `complete: thread=${input.payload.threadId} round=${String(round)} chars=${String(joined.content.length)} finish=${joined.finishReason ?? 'none'}`,
      );
    }
    return joined;
  }

  /** The same context with the partial answer as the model's turn and a user turn asking it to continue. */
  private continuationContext(
    input: LongOutputRequest,
    partial: string,
  ): LongOutputRequest['context'] {
    const anchor = input.anchor;
    if (anchor === undefined) {
      return withContextSaveNote(input.context, LONG_OUTPUT_CONTINUE_NOTE);
    }
    const assistantTurn: ChatMessage = {
      ...anchor,
      id: `${anchor.id}:partial`,
      role: 'ASSISTANT',
      content: partial,
      metadata: null,
    };
    const continueTurn: ChatMessage = {
      ...anchor,
      id: `${anchor.id}:continue`,
      role: 'USER',
      content: LONG_OUTPUT_CONTINUE_NOTE,
      metadata: null,
    };
    return withContextSaveNote(
      {
        ...input.context,
        threadMessages: [...input.context.threadMessages, assistantTurn, continueTurn],
      },
      LONG_OUTPUT_CONTINUE_NOTE,
    );
  }

  private join(first: LlmResponse, next: LlmResponse): LlmResponse {
    return {
      ...first,
      content: `${first.content}${next.content}`,
      outputTokens: (first.outputTokens ?? 0) + (next.outputTokens ?? 0),
      inputTokens: (first.inputTokens ?? 0) + (next.inputTokens ?? 0),
      latencyMs: first.latencyMs + next.latencyMs,
      finishReason: next.finishReason,
      ...(next.reasoning === undefined
        ? {}
        : { reasoning: `${first.reasoning ?? ''}${next.reasoning}` }),
    };
  }
}
