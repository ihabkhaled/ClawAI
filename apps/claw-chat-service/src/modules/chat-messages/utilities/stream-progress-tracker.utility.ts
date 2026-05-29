import {
  AiStreamProgressConfidence,
  AiStreamStage,
} from '../../../common/enums';
import {
  COMPLETE_PERCENT,
  FINALIZING_CEILING_PERCENT,
  GENERATING_CEILING_PERCENT,
  GENERATING_FLOOR_PERCENT,
  GENERATING_SPAN_PERCENT,
  STAGE_PROGRESS_FLOOR,
  TOKEN_RAMP_SCALE,
} from '../constants/stream-progress.constants';
import { recordGet } from '../../../common/utilities';
import { type StreamMetrics } from '../types/stream.types';
import { estimateCostUsd } from './cost-estimator.utility';

// Per-run progress + metrics engine. One instance per stream run. Progress is
// monotonic (never decreases), capped at 95% until generation finishes and 99%
// during finalization; only the explicit COMPLETE snapshot reaches 100%.
export class StreamProgressTracker {
  private firstTokenMs?: number;
  private generatedChars = 0;
  private generatedTokens = 0;
  private lastPercent = 0;

  constructor(
    private readonly provider: string,
    private readonly model: string,
    private readonly startMs: number,
    private readonly promptTokensEstimate: number,
    private readonly maxOutputTokens?: number,
  ) {}

  recordFirstToken(nowMs: number): void {
    if (this.firstTokenMs === undefined) {
      this.firstTokenMs = nowMs - this.startMs;
    }
  }

  recordContentDelta(deltaChars: number, deltaTokens: number): void {
    this.generatedChars += deltaChars;
    this.generatedTokens += deltaTokens;
  }

  get charCount(): number {
    return this.generatedChars;
  }

  get tokenCount(): number {
    return this.generatedTokens;
  }

  snapshot(stage: AiStreamStage, nowMs: number): StreamMetrics {
    const elapsedMs = nowMs - this.startMs;
    const { percent, confidence } = this.computePercent(stage);
    const cost = estimateCostUsd(
      this.provider,
      this.model,
      this.promptTokensEstimate,
      this.generatedTokens,
    );
    return {
      elapsedMs,
      timeToFirstTokenMs: this.firstTokenMs,
      tokensPerSecond: this.computeTokensPerSecond(elapsedMs),
      generatedTokens: this.generatedTokens,
      estimatedTotalOutputTokens: this.maxOutputTokens,
      progressPercent: percent,
      progressConfidence: confidence,
      estimatedCostUsd: cost.available ? cost.costUsd : undefined,
    };
  }

  private computeTokensPerSecond(elapsedMs: number): number | undefined {
    if (this.firstTokenMs === undefined || this.generatedTokens === 0) {
      return undefined;
    }
    const generationMs = elapsedMs - this.firstTokenMs;
    if (generationMs <= 0) {
      return undefined;
    }
    return this.generatedTokens / (generationMs / 1000);
  }

  private computePercent(stage: AiStreamStage): {
    percent: number;
    confidence: AiStreamProgressConfidence;
  } {
    if (stage === AiStreamStage.COMPLETE) {
      this.lastPercent = COMPLETE_PERCENT;
      return { percent: COMPLETE_PERCENT, confidence: AiStreamProgressConfidence.EXACT };
    }
    if (
      stage === AiStreamStage.CANCELLED ||
      stage === AiStreamStage.ERROR ||
      stage === AiStreamStage.INCOMPLETE
    ) {
      return { percent: this.lastPercent, confidence: AiStreamProgressConfidence.UNKNOWN };
    }
    if (stage === AiStreamStage.GENERATING) {
      return this.computeGeneratingPercent();
    }
    const floor = recordGet(STAGE_PROGRESS_FLOOR, stage) ?? this.lastPercent;
    const capped = Math.min(floor, FINALIZING_CEILING_PERCENT);
    return {
      percent: this.advance(capped),
      confidence: AiStreamProgressConfidence.STAGE_BASED,
    };
  }

  private computeGeneratingPercent(): {
    percent: number;
    confidence: AiStreamProgressConfidence;
  } {
    const fraction =
      this.maxOutputTokens !== undefined && this.maxOutputTokens > 0
        ? Math.min(1, this.generatedTokens / this.maxOutputTokens)
        : 1 - Math.exp(-this.generatedTokens / TOKEN_RAMP_SCALE);
    const raw = GENERATING_FLOOR_PERCENT + GENERATING_SPAN_PERCENT * fraction;
    const capped = Math.min(raw, GENERATING_CEILING_PERCENT);
    return {
      percent: this.advance(capped),
      confidence: AiStreamProgressConfidence.ESTIMATED,
    };
  }

  // Monotonic: progress can only move forward.
  private advance(candidate: number): number {
    const next = Math.max(this.lastPercent, Math.round(candidate));
    this.lastPercent = next;
    return next;
  }
}
