import { Injectable, Logger } from '@nestjs/common';
import { AiReasoningVisibility, AiStreamProtocol, AiStreamStage } from '../../../common/enums';
import { httpStream } from '../../../common/utilities';
import { BusinessException } from '../../../common/errors';
import { ChatStreamService } from '../services/chat-stream.service';
import { ProviderStreamReader } from '../utilities/provider-stream-reader.utility';
import { ThinkingFragmentScanner } from '../utilities/thinking-fragment-scanner.utility';
import { StreamProgressTracker } from '../utilities/stream-progress-tracker.utility';
import { estimateTokensFromText } from '../utilities/token-estimator.utility';
import { computeFinalStreamMetrics } from '../utilities/final-metrics.utility';
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
import {
  type StreamMetrics,
  type StreamStageTimestamps,
  type StreamStageTimings,
} from '../types/stream.types';
import { type EmitCtx, type LoopState } from '../types/provider-stream-executor.types';

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
    const state = this.newState();
    this.transitionStage(ctx, state, AiStreamStage.CONNECTING_PROVIDER, 'Connecting to provider');
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

    this.transitionStage(ctx, state, AiStreamStage.WAITING_FIRST_TOKEN, 'Waiting for first token');
    return this.consume(ctx, input, result.chunks, state);
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

    this.transitionStage(ctx, state, AiStreamStage.CONNECTING_PROVIDER, 'Connecting to provider');
    if (input.reasoningContent !== undefined && input.reasoningContent.length > 0) {
      for (const piece of this.chunkText(input.reasoningContent)) {
        if (this.stopCancelledSimulation(input, state)) {
          break;
        }
        this.applyReasoning(piece, AiReasoningVisibility.MODEL_EMITTED, ctx, state);
        await this.delay(SIMULATED_CHUNK_DELAY_MS, input.abortSignal);
      }
    }
    if (!state.cancelled) {
      for (const piece of this.chunkText(input.fullContent)) {
        if (this.stopCancelledSimulation(input, state)) {
          break;
        }
        const scanned = scanner.push(piece);
        this.applyReasoning(scanned.reasoning, AiReasoningVisibility.MODEL_EMITTED, ctx, state);
        this.applyContent(scanned.content, ctx, tracker, state);
        this.maybeEmitMetrics(ctx, tracker, state);
        await this.delay(SIMULATED_CHUNK_DELAY_MS, input.abortSignal);
      }
    }
    if (!state.cancelled) {
      this.drainScanner(scanner, ctx, tracker, state);
    }
    state.inputTokens = input.inputTokens;
    state.outputTokens = input.outputTokens;
    this.finalize(ctx, tracker, state);
    return this.toResult(state);
  }

  private async consume(
    ctx: EmitCtx,
    input: StreamExecutionInput,
    chunks: AsyncGenerator<string>,
    state: LoopState,
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
      // `??` and not `|| 0`: a provider that reports nothing must stay absent
      // so the PAYG finalize can tell "no measured sub-count" from a measured
      // zero. Coercing to 0 here would make a cache hit indistinguishable from
      // a cache miss.
      state.cachedPromptTokens = fragment.cachedPromptTokens ?? state.cachedPromptTokens;
      state.reasoningTokens = fragment.reasoningTokens ?? state.reasoningTokens;
      return;
    }
    if (fragment.kind === 'tool-calls') {
      // The reader releases these exactly once, already merged. No emit: tool
      // arguments can carry workspace paths and file contents, and the SSE
      // channel is the user-visible transcript. The Runtime V2 timeline is
      // where a tool request becomes visible, after policy and approval.
      state.toolCalls = fragment.calls;
      return;
    }
    state.finishReason = fragment.finishReason ?? state.finishReason;
    if (fragment.finalTimings !== undefined) {
      state.finalTimings = fragment.finalTimings;
    }
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
      this.transitionStage(ctx, state, AiStreamStage.GENERATING, 'Generating response');
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
      this.transitionStage(ctx, state, AiStreamStage.THINKING, 'Thinking');
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

  private maybeEmitMetrics(ctx: EmitCtx, tracker: StreamProgressTracker, state: LoopState): void {
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
    this.closeStageIfActive(state, Date.now());
    const baseMetrics = tracker.snapshot(stage, Date.now());
    const enriched = this.buildFinalMetrics(baseMetrics, state);
    // Stashed so the caller can report MEASURED speed rather than inferring it
    // from the requested tier — §11.5 requires the figures to be tracked, and
    // a number derived from a profile name is not a measurement.
    state.finalMetrics = enriched;
    this.streamService.emitMetrics(ctx.threadId, {
      provider: ctx.provider,
      model: ctx.model,
      streamRunId: ctx.messageId,
      messageId: ctx.messageId,
      laneId: ctx.laneId,
      parallelGroupId: ctx.parallelGroupId,
      metrics: enriched,
    });
    this.logger.debug(
      `finalize: provider=${ctx.provider} model=${ctx.model} chars=${String(state.content.length)} cancelled=${String(state.cancelled)} bottleneck=${enriched.bottleneck?.stage ?? 'none'}`,
    );
  }

  // Merges the live tracker snapshot with any Ollama-style nanosecond timings
  // captured on the terminal frame + the per-stage wall-clock map. Bottleneck
  // is the slowest of (modelLoad, promptEval, generation) when those numbers
  // are available; otherwise undefined (cloud streams skip the breakdown bar).
  private buildFinalMetrics(base: StreamMetrics, state: LoopState): StreamMetrics {
    const stageTimings = this.serializeStageTimings(state.stageTimings);
    if (state.finalTimings === undefined) {
      return Object.keys(stageTimings).length > 0 ? { ...base, stageTimings } : base;
    }
    const rich = computeFinalStreamMetrics(state.finalTimings);
    return {
      ...base,
      ...rich,
      ...(Object.keys(stageTimings).length > 0 ? { stageTimings } : {}),
    };
  }

  private serializeStageTimings(
    map: Map<AiStreamStage, StreamStageTimestamps>,
  ): StreamStageTimings {
    const result: StreamStageTimings = {};
    for (const [stage, window] of map) {
      result[stage] = { ...window };
    }
    return result;
  }

  // Public lifecycle emit + per-stage wall-clock window capture. Closes the
  // previous stage's `endedAtMs` before opening the new one so the timeline
  // ends up with contiguous, non-overlapping windows.
  private transitionStage(
    ctx: EmitCtx,
    state: LoopState,
    stage: AiStreamStage,
    label: string,
  ): void {
    const now = Date.now();
    this.closeStageIfActive(state, now);
    if (!state.stageTimings.has(stage)) {
      state.stageTimings.set(stage, { startedAtMs: now });
    }
    state.currentStage = stage;
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

  private closeStageIfActive(state: LoopState, nowMs: number): void {
    if (state.currentStage === undefined) {
      return;
    }
    const existing = state.stageTimings.get(state.currentStage);
    if (existing !== undefined && existing.endedAtMs === undefined) {
      state.stageTimings.set(state.currentStage, { ...existing, endedAtMs: nowMs });
    }
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
    return {
      content: '',
      reasoning: '',
      sawContent: false,
      lastMetricsAt: 0,
      cancelled: false,
      stageTimings: new Map(),
    };
  }

  private toResult(state: LoopState): StreamExecutionResult {
    return {
      content: state.content,
      reasoning: state.reasoning,
      inputTokens: state.inputTokens,
      outputTokens: state.outputTokens,
      cachedPromptTokens: state.cachedPromptTokens,
      reasoningTokens: state.reasoningTokens,
      finishReason: state.finishReason,
      cancelled: state.cancelled,
      ...(state.toolCalls === undefined ? {} : { toolCalls: state.toolCalls }),
      ...(state.finalMetrics === undefined ? {} : { finalMetrics: state.finalMetrics }),
    };
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += SIMULATED_CHUNK_SIZE_CHARS) {
      chunks.push(text.slice(i, i + SIMULATED_CHUNK_SIZE_CHARS));
    }
    return chunks;
  }

  private stopCancelledSimulation(input: SimulatedStreamInput, state: LoopState): boolean {
    if (input.abortSignal?.aborted !== true) {
      return false;
    }
    state.cancelled = true;
    return true;
  }

  private async delay(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted === true) {
      return;
    }
    await new Promise<void>((resolve) => {
      const finish = (): void => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', finish);
        resolve();
      };
      const timer = setTimeout(finish, ms);
      signal?.addEventListener('abort', finish, { once: true });
      if (signal?.aborted === true) {
        finish();
      }
    });
  }

  private truncateError(body: string | undefined): string | undefined {
    if (body === undefined || body.length === 0) {
      return undefined;
    }
    return body.length > 300 ? `${body.slice(0, 297)}...` : body;
  }
}
