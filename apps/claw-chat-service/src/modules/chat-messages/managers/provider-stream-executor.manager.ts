import { Injectable, Logger } from '@nestjs/common';
import { AiReasoningVisibility, AiStreamProtocol, AiStreamStage } from '../../../common/enums';
import { httpStream } from '../../../common/utilities';
import { BusinessException } from '../../../common/errors';
import { ChatStreamService } from '../services/chat-stream.service';
import { ProviderStreamReader } from '../utilities/provider-stream-reader.utility';
import { ThinkingFragmentScanner } from '../utilities/thinking-fragment-scanner.utility';
import { StreamProgressTracker } from '../utilities/stream-progress-tracker.utility';
import { estimateTokensFromText } from '../utilities/token-estimator.utility';
import {
  METRICS_THROTTLE_MS,
  SIMULATED_CHUNK_DELAY_MS,
  SIMULATED_CHUNK_SIZE_CHARS,
} from '../constants/stream-progress.constants';
import { type NormalizedStreamFragment } from '../types/provider-stream.types';
import {
  type SimulatedStreamInput,
  type StreamExecutionInput,
  type StreamExecutionResult,
} from '../types/stream-execution.types';

type EmitCtx = {
  threadId: string;
  provider: string;
  model: string;
  messageId?: string;
  laneId?: string;
  parallelGroupId?: string;
  protocol: AiStreamProtocol;
};

type LoopState = {
  content: string;
  reasoning: string;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
  sawContent: boolean;
  lastMetricsAt: number;
  cancelled: boolean;
};

// Runs the read → normalize → split → emit loop for a single streaming model
// run, emitting live content/reasoning/metric deltas over the existing SSE
// channel and returning the fully accumulated response (so downstream
// persistence/quality logic is unchanged). Provider-agnostic: the caller
// builds the request. `runSimulated` covers providers that cannot stream.
@Injectable()
export class ProviderStreamExecutor {
  private readonly logger = new Logger(ProviderStreamExecutor.name);

  constructor(private readonly streamService: ChatStreamService) {}

  async run(input: StreamExecutionInput): Promise<StreamExecutionResult> {
    const ctx = this.toCtx(input);
    this.emitLifecycle(ctx, AiStreamStage.CONNECTING_PROVIDER, 'Connecting to provider');
    const result = await httpStream({
      url: input.url,
      method: 'POST',
      headers: input.headers,
      body: input.body,
      timeoutMs: input.timeoutMs,
      signal: input.abortSignal,
    });

    if (!result.ok) {
      throw new BusinessException(
        this.truncateError(result.errorBody) ??
          `Provider ${input.provider} returned ${String(result.status)}`,
        'STREAM_PROVIDER_REQUEST_FAILED',
      );
    }

    this.emitLifecycle(ctx, AiStreamStage.WAITING_FIRST_TOKEN, 'Waiting for first token');
    return this.consume(ctx, input, result.chunks);
  }

  // Simulated path: the provider returned a fully-buffered response which we
  // chunk back out so the UI animates. Progress is labelled estimated.
  async runSimulated(input: SimulatedStreamInput): Promise<StreamExecutionResult> {
    const ctx: EmitCtx = {
      threadId: input.threadId,
      provider: input.provider,
      model: input.model,
      messageId: input.messageId,
      laneId: input.laneId,
      parallelGroupId: input.parallelGroupId,
      protocol: AiStreamProtocol.SIMULATED,
    };
    const tracker = new StreamProgressTracker(
      input.provider,
      input.model,
      input.startMs,
      input.promptTokensEstimate,
      input.maxOutputTokens,
    );
    const scanner = new ThinkingFragmentScanner();
    const state = this.newState();

    this.emitLifecycle(ctx, AiStreamStage.CONNECTING_PROVIDER, 'Connecting to provider');
    if (input.reasoningContent !== undefined && input.reasoningContent.length > 0) {
      for (const piece of this.chunkText(input.reasoningContent)) {
        this.applyReasoning(piece, AiReasoningVisibility.MODEL_EMITTED, ctx, state);
        await this.delay(SIMULATED_CHUNK_DELAY_MS);
      }
    }
    for (const piece of this.chunkText(input.fullContent)) {
      const scanned = scanner.push(piece);
      this.applyReasoning(scanned.reasoning, AiReasoningVisibility.MODEL_EMITTED, ctx, state);
      this.applyContent(scanned.content, ctx, tracker, state);
      this.maybeEmitMetrics(ctx, tracker, state);
      await this.delay(SIMULATED_CHUNK_DELAY_MS);
    }
    this.drainScanner(scanner, ctx, tracker, state);
    state.inputTokens = input.inputTokens;
    state.outputTokens = input.outputTokens;
    this.finalize(ctx, tracker, state);
    return this.toResult(state);
  }

  private async consume(
    ctx: EmitCtx,
    input: StreamExecutionInput,
    chunks: AsyncGenerator<string>,
  ): Promise<StreamExecutionResult> {
    const reader = new ProviderStreamReader(input.protocol);
    const scanner = new ThinkingFragmentScanner();
    const tracker = new StreamProgressTracker(
      input.provider,
      input.model,
      input.startMs,
      input.promptTokensEstimate,
      input.maxOutputTokens,
    );
    const state = this.newState();

    for await (const chunk of chunks) {
      if (input.abortSignal.aborted) {
        state.cancelled = true;
        break;
      }
      for (const fragment of reader.push(chunk)) {
        this.handleFragment(fragment, ctx, scanner, tracker, state);
      }
      this.maybeEmitMetrics(ctx, tracker, state);
    }

    this.drainScanner(scanner, ctx, tracker, state);
    this.finalize(ctx, tracker, state);
    return this.toResult(state);
  }

  private handleFragment(
    fragment: NormalizedStreamFragment,
    ctx: EmitCtx,
    scanner: ThinkingFragmentScanner,
    tracker: StreamProgressTracker,
    state: LoopState,
  ): void {
    if (fragment.kind === 'content') {
      const scanned = scanner.push(fragment.text);
      this.applyReasoning(scanned.reasoning, AiReasoningVisibility.MODEL_EMITTED, ctx, state);
      this.applyContent(scanned.content, ctx, tracker, state);
      return;
    }
    if (fragment.kind === 'reasoning') {
      this.applyReasoning(fragment.text, fragment.visibility, ctx, state);
      return;
    }
    if (fragment.kind === 'usage') {
      state.inputTokens = fragment.promptTokens ?? state.inputTokens;
      state.outputTokens = fragment.completionTokens ?? state.outputTokens;
      return;
    }
    state.finishReason = fragment.finishReason ?? state.finishReason;
  }

  private applyContent(
    text: string,
    ctx: EmitCtx,
    tracker: StreamProgressTracker,
    state: LoopState,
  ): void {
    if (text.length === 0) {
      return;
    }
    if (!state.sawContent) {
      state.sawContent = true;
      tracker.recordFirstToken(Date.now());
      this.emitLifecycle(ctx, AiStreamStage.GENERATING, 'Generating response');
    }
    state.content += text;
    tracker.recordContentDelta(text.length, estimateTokensFromText(text));
    this.streamService.emitContentDelta(ctx.threadId, {
      provider: ctx.provider,
      model: ctx.model,
      streamRunId: ctx.messageId,
      messageId: ctx.messageId,
      laneId: ctx.laneId,
      parallelGroupId: ctx.parallelGroupId,
      delta: text,
      accumulatedChars: state.content.length,
    });
  }

  private applyReasoning(
    text: string,
    visibility: AiReasoningVisibility,
    ctx: EmitCtx,
    state: LoopState,
  ): void {
    if (text.length === 0) {
      return;
    }
    if (!state.sawContent && state.reasoning.length === 0) {
      this.emitLifecycle(ctx, AiStreamStage.THINKING, 'Thinking');
    }
    state.reasoning += text;
    this.streamService.emitReasoningDelta(ctx.threadId, {
      provider: ctx.provider,
      model: ctx.model,
      streamRunId: ctx.messageId,
      messageId: ctx.messageId,
      laneId: ctx.laneId,
      parallelGroupId: ctx.parallelGroupId,
      reasoningDelta: text,
      visibility,
    });
  }

  private drainScanner(
    scanner: ThinkingFragmentScanner,
    ctx: EmitCtx,
    tracker: StreamProgressTracker,
    state: LoopState,
  ): void {
    const tail = scanner.flush();
    this.applyReasoning(tail.reasoning, AiReasoningVisibility.MODEL_EMITTED, ctx, state);
    this.applyContent(tail.content, ctx, tracker, state);
  }

  private maybeEmitMetrics(
    ctx: EmitCtx,
    tracker: StreamProgressTracker,
    state: LoopState,
  ): void {
    const now = Date.now();
    if (now - state.lastMetricsAt < METRICS_THROTTLE_MS) {
      return;
    }
    state.lastMetricsAt = now;
    this.streamService.emitMetrics(ctx.threadId, {
      provider: ctx.provider,
      model: ctx.model,
      streamRunId: ctx.messageId,
      messageId: ctx.messageId,
      laneId: ctx.laneId,
      parallelGroupId: ctx.parallelGroupId,
      metrics: tracker.snapshot(AiStreamStage.GENERATING, now),
    });
  }

  private finalize(ctx: EmitCtx, tracker: StreamProgressTracker, state: LoopState): void {
    const stage = state.cancelled ? AiStreamStage.CANCELLED : AiStreamStage.FINALIZING;
    this.streamService.emitMetrics(ctx.threadId, {
      provider: ctx.provider,
      model: ctx.model,
      streamRunId: ctx.messageId,
      messageId: ctx.messageId,
      laneId: ctx.laneId,
      parallelGroupId: ctx.parallelGroupId,
      metrics: tracker.snapshot(stage, Date.now()),
    });
    this.logger.debug(
      `finalize: provider=${ctx.provider} model=${ctx.model} chars=${String(state.content.length)} cancelled=${String(state.cancelled)}`,
    );
  }

  private emitLifecycle(ctx: EmitCtx, stage: AiStreamStage, label: string): void {
    this.streamService.emitStreamLifecycle(ctx.threadId, {
      provider: ctx.provider,
      model: ctx.model,
      streamRunId: ctx.messageId,
      messageId: ctx.messageId,
      laneId: ctx.laneId,
      parallelGroupId: ctx.parallelGroupId,
      protocol: ctx.protocol,
      stage,
      label,
    });
  }

  private toCtx(input: StreamExecutionInput): EmitCtx {
    return {
      threadId: input.threadId,
      provider: input.provider,
      model: input.model,
      messageId: input.messageId,
      laneId: input.laneId,
      parallelGroupId: input.parallelGroupId,
      protocol: input.protocol,
    };
  }

  private newState(): LoopState {
    return { content: '', reasoning: '', sawContent: false, lastMetricsAt: 0, cancelled: false };
  }

  private toResult(state: LoopState): StreamExecutionResult {
    return {
      content: state.content,
      reasoning: state.reasoning,
      inputTokens: state.inputTokens,
      outputTokens: state.outputTokens,
      finishReason: state.finishReason,
      cancelled: state.cancelled,
    };
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += SIMULATED_CHUNK_SIZE_CHARS) {
      chunks.push(text.slice(i, i + SIMULATED_CHUNK_SIZE_CHARS));
    }
    return chunks;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private truncateError(body: string | undefined): string | undefined {
    if (body === undefined || body.length === 0) {
      return undefined;
    }
    return body.length > 300 ? `${body.slice(0, 297)}...` : body;
  }
}
