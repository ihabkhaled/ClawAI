import { PaygSurface } from '@claw/shared-types';
import { assertSafeRequestUrl, declaredHost, estimateTextTokens } from '@claw/shared-utilities';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';

import { AppConfig } from '../../app/config/app.config';
import { abortReasonToError } from '../generation/utilities/abort-reason-error.utility';
import { checkRoleContextFit } from '../generation/utilities/context-fit.utility';
import { DeterministicGenerationError } from '../generation/utilities/deterministic-generation.error';
import {
  CHAT_GENERATE_PATH,
  CHAT_GENERATE_STREAM_PATH,
  GATEWAY_ERROR_CODE_PATTERN,
  HTTP_NOT_FOUND,
  MODEL_CALL_CEILING_MESSAGE,
  MODEL_CALL_IDLE_MESSAGE,
  MODEL_CALL_IDLE_TIMEOUT_MS,
  MODEL_CALL_MAX_TOTAL_MS,
  MODEL_HARD_CEILING_CODE,
  MODEL_STREAM_TRUNCATED_MESSAGE,
  MS_PER_SECOND,
  NDJSON_CONTENT_TYPE,
} from './constants/model-call.constants';
import {
  CONTEXT_WINDOW_ASSUMED_EXCEEDED_MESSAGE,
  CONTEXT_WINDOW_EXCEEDED_MESSAGE,
} from './constants/model-context.constants';
import { ChatModelIncompleteError } from './chat-model-incomplete.error';
import { ChatUpstreamError } from './chat-upstream.error';
import { ModelCallCeilingError } from './model-call-ceiling.error';
import { ModelContextClient } from './model-context.client';
import { chatStreamFrameSchema } from './schemas/chat-generate-stream.schema';
import type { ModelCallGuard } from './types/model-call.types';
import { createModelCallGuard } from './utilities/model-call-guard.utility';
import { readNdjsonLines } from './utilities/ndjson-lines.utility';

// Integer micro-USD as settled by the gateway; anything else is not a cost and is dropped.
const microUsdSchema = z.number().int().nonnegative().safe();

const modelResponseSchema = z.object({
  content: z.string().min(1),
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().nonnegative().optional(),
  outputTokens: z.number().nonnegative().optional(),
  durationMs: z.number().nonnegative(),
  clamped: z.boolean(),
  costMicroUsd: microUsdSchema.optional(),
});

const reportedCostSchema = z.object({ costMicroUsd: microUsdSchema.optional() });

export type ChatModelRequest = {
  ownerId: string;
  requestId: string;
  budgetId: string;
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
  /** Aborting it (cancel, lease loss, attempt ceiling) stops the call in flight. */
  signal?: AbortSignal;
};

const gatewayErrorSchema = z.object({
  code: z.string().regex(GATEWAY_ERROR_CODE_PATTERN).optional(),
});

export type ChatModelResponse = z.infer<typeof modelResponseSchema>;

/**
 * Calls chat-service for one model reply. The call is read as a stream of frames and is
 * bounded by silence, not by the clock: a model that is still answering or thinking keeps
 * the call alive, one that goes quiet for MODEL_CALL_IDLE_TIMEOUT_MS is stuck, and a call
 * never outlives MODEL_CALL_MAX_TOTAL_MS. The job's signal aborts the call in flight.
 */
@Injectable()
export class ChatModelClient {
  constructor(private readonly modelContext: ModelContextClient) {}

  async generate(input: ChatModelRequest): Promise<ChatModelResponse> {
    await this.requireContextFit(input);
    const guard = createModelCallGuard({
      idleMs: MODEL_CALL_IDLE_TIMEOUT_MS,
      maxMs: MODEL_CALL_MAX_TOTAL_MS,
      cancelSignal: input.signal,
    });
    try {
      return await this.callGateway(input, guard);
    } catch (error: unknown) {
      throw this.explainAbort(error, guard, input.signal);
    } finally {
      guard.dispose();
    }
  }

  private async requireContextFit(input: ChatModelRequest): Promise<void> {
    const promptTokens = estimateTextTokens(`${input.systemPrompt}\n${input.userPrompt}`);
    const window = await this.modelContext.getWindow(input.provider, input.model);
    const contextFit = checkRoleContextFit({
      provider: input.provider,
      model: input.model,
      promptTokens,
      outputReserveTokens: input.maxOutputTokens,
      knownWindowTokens: window.tokens,
    });
    if (!contextFit.fits) {
      // The same prompt overflows the same window on a retry, so this is not retried.
      throw new DeterministicGenerationError(
        window.source === 'assumed'
          ? CONTEXT_WINDOW_ASSUMED_EXCEEDED_MESSAGE
          : CONTEXT_WINDOW_EXCEEDED_MESSAGE,
      );
    }
  }

  private async callGateway(
    input: ChatModelRequest,
    guard: ModelCallGuard,
  ): Promise<ChatModelResponse> {
    const response = await this.post(CHAT_GENERATE_STREAM_PATH, input, guard);
    if (response.status === HTTP_NOT_FOUND) {
      // A chat-service replica that predates the stream route. One release of fallback so
      // deploy order does not matter; the buffered call has no activity to watch.
      await this.discardBody(response);
      return this.callBuffered(input, guard);
    }
    if (!response.ok) throw await this.requestFailed(response);
    guard.touch();
    return this.readFrames(response, guard);
  }

  private async discardBody(response: Response): Promise<void> {
    try {
      await response.body?.cancel();
    } catch {
      // The body is only being dropped; a connection that is already closed is fine.
    }
  }

  private async callBuffered(
    input: ChatModelRequest,
    guard: ModelCallGuard,
  ): Promise<ChatModelResponse> {
    guard.disableIdle();
    const response = await this.post(CHAT_GENERATE_PATH, input, guard);
    if (!response.ok) throw await this.requestFailed(response);
    return this.acceptReply(await response.json());
  }

  private async post(
    path: string,
    input: ChatModelRequest,
    guard: ModelCallGuard,
  ): Promise<Response> {
    const config = AppConfig.get();
    const url = `${config.CHAT_SERVICE_URL}${path}`;
    assertSafeRequestUrl(url, declaredHost(config.CHAT_SERVICE_URL));
    try {
      return await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: NDJSON_CONTENT_TYPE,
          'x-request-id': input.requestId,
        },
        body: JSON.stringify({
          userId: input.ownerId,
          requestId: input.requestId,
          threadJobBudgetId: input.budgetId,
          surface: PaygSurface.THREADS,
          provider: input.provider,
          model: input.model,
          systemPrompt: input.systemPrompt,
          userPrompt: input.userPrompt,
          maxTokens: input.maxOutputTokens,
          workflow: 'threads_generation',
        }),
        signal: guard.signal,
      });
    } catch {
      throw new ServiceUnavailableException('Chat model gateway is unavailable');
    }
  }

  private async readFrames(response: Response, guard: ModelCallGuard): Promise<ChatModelResponse> {
    if (!response.body) throw new ServiceUnavailableException(MODEL_STREAM_TRUNCATED_MESSAGE);
    const lines = readNdjsonLines(response.body, { onBytes: guard.touch, signal: guard.signal });
    for await (const line of lines) {
      const frame = chatStreamFrameSchema.safeParse(line);
      // An unknown frame type is ignored: the contract may grow, and its bytes already
      // counted as activity.
      if (!frame.success || frame.data.type === 'activity') continue;
      if (frame.data.type === 'result') return this.acceptReply(frame.data.data);
      throw this.upstreamFailure(frame.data.status, frame.data.code, {
        message: frame.data.message,
        retryAfterSeconds: frame.data.retryAfterSeconds,
      });
    }
    throw new ServiceUnavailableException(MODEL_STREAM_TRUNCATED_MESSAGE);
  }

  private acceptReply(body: unknown): ChatModelResponse {
    const parsed = modelResponseSchema.safeParse(body);
    if (!parsed.success || parsed.data.clamped) {
      throw new ChatModelIncompleteError(reportedCost(parsed.success ? parsed.data : body));
    }
    return parsed.data;
  }

  private async requestFailed(response: Response): Promise<Error> {
    const parsed = gatewayErrorSchema.safeParse(await response.json().catch(() => null));
    return this.upstreamFailure(response.status, parsed.success ? parsed.data.code : undefined);
  }

  private upstreamFailure(
    status: number,
    code: string | undefined,
    detail: { message?: string; retryAfterSeconds?: number } = {},
  ): ServiceUnavailableException {
    const message = `Chat model request failed (${String(status)}${code ? `: ${code}` : ''})`;
    if (code === MODEL_HARD_CEILING_CODE) return new ModelCallCeilingError(message);
    return new ChatUpstreamError(
      message,
      detail.message ?? null,
      detail.retryAfterSeconds === undefined ? null : detail.retryAfterSeconds * MS_PER_SECOND,
    );
  }

  /** Whatever the transport reported after an abort is a symptom; the cause is the answer. */
  private explainAbort(error: unknown, guard: ModelCallGuard, signal?: AbortSignal): unknown {
    switch (guard.cause()) {
      case 'cancelled':
        return abortReasonToError(signal?.reason);
      case 'idle':
        return new ServiceUnavailableException(MODEL_CALL_IDLE_MESSAGE);
      case 'ceiling':
        return new ModelCallCeilingError(MODEL_CALL_CEILING_MESSAGE);
      case null:
        return error;
    }
  }
}

// The cost of a reply that failed validation, read on its own so it is not lost with the reply.
function reportedCost(body: unknown): number {
  const parsed = reportedCostSchema.safeParse(body);
  return parsed.success ? (parsed.data.costMicroUsd ?? 0) : 0;
}
