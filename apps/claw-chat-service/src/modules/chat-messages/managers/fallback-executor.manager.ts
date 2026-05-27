// FallbackExecutorManager — Phase 5 of the semantic router flagship
// (docs/03-architecture/semantic-router-flagship-plan.md §5).
//
// Iterates a candidate chain (primary + fallbacks), invoking a caller-
// provided callback per candidate, recording per-attempt telemetry, and
// stopping on the first SUCCESS. RE_ROUTE keeps iterating; FAILURE
// records the error and tries the next candidate.
//
// The manager is intentionally generic over the response type so it can
// be reused for chat completions, parallel compare, image generation,
// etc. It contains NO LLM-specific logic — that lives in the callback.

import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { FALLBACK_EXECUTOR_HARD_MAX_ATTEMPTS } from '../constants/fallback-executor.constants';
import type {
  AttemptRecord,
  CandidateCallbackResult,
  FallbackCandidate,
  FallbackChainOutcome,
} from '../types/fallback-executor.types';

@Injectable()
export class FallbackExecutorManager {
  private readonly logger = new Logger(FallbackExecutorManager.name);

  // Returns the effective cap = min(env limit, hard ceiling, candidate
  // list length). Honors `ROUTING_FALLBACK_ATTEMPTS_ENABLED=false` by
  // capping at 1 (primary only — no fallback).
  resolveMaxAttempts(candidateCount: number): number {
    const config = AppConfig.get();
    if (!config.ROUTING_FALLBACK_ATTEMPTS_ENABLED) {
      // Flag off — primary only. Caller can still attempt 1, but no
      // formal fallback walk. This matches v1 hot-path behaviour when
      // routing-service returns just selectedProvider/Model.
      return Math.min(1, candidateCount);
    }
    const envLimit = config.ROUTING_MAX_FALLBACK_ATTEMPTS;
    return Math.min(envLimit, FALLBACK_EXECUTOR_HARD_MAX_ATTEMPTS, candidateCount);
  }

  // Walks the candidate chain. Stops at the first SUCCESS. RE_ROUTE
  // counts toward the attempt budget. FAILURE never throws — the error
  // is recorded and the loop moves on. If every candidate fails the
  // outcome is `exhausted` with the last error preserved.
  async executeChain<TResponse>(
    candidates: FallbackCandidate[],
    runCandidate: (
      candidate: FallbackCandidate,
      attemptIndex: number,
    ) => Promise<CandidateCallbackResult<TResponse>>,
  ): Promise<FallbackChainOutcome<TResponse>> {
    const maxAttempts = this.resolveMaxAttempts(candidates.length);
    this.logger.debug(
      `executeChain: starting candidates=${String(candidates.length)} maxAttempts=${String(maxAttempts)}`,
    );

    const attempts: AttemptRecord[] = [];
    let lastError: unknown = null;

    for (let index = 0; index < maxAttempts; index++) {
      const candidate = candidates.at(index);
      if (!candidate) {
        break;
      }
      const record = await this.runSingleAttempt(candidate, index, runCandidate);
      attempts.push(record.record);

      if (record.outcome.status === 'SUCCESS') {
        this.logger.log(
          `executeChain: success at attempt=${String(index + 1)} provider=${candidate.provider} model=${candidate.model}`,
        );
        return { kind: 'success', response: record.outcome.response, attempts };
      }

      if (record.outcome.status === 'RE_ROUTE') {
        this.logger.debug(
          `executeChain: re-route from ${candidate.provider}/${candidate.model} — quality below threshold`,
        );
        continue;
      }

      // FAILURE — preserve error, try next candidate.
      lastError = record.outcome.error;
      this.logger.warn(
        `executeChain: candidate ${String(index + 1)}/${String(maxAttempts)} failed — ${(record.outcome.errorMessage ?? String(record.outcome.error)).slice(0, 200)}`,
      );
    }

    this.logger.error(
      `executeChain: exhausted ${String(attempts.length)} attempts — last error: ${(lastError as Error | null)?.message ?? 'none'}`,
    );
    return { kind: 'exhausted', lastError, attempts };
  }

  private async runSingleAttempt<TResponse>(
    candidate: FallbackCandidate,
    attemptIndex: number,
    runCandidate: (
      candidate: FallbackCandidate,
      attemptIndex: number,
    ) => Promise<CandidateCallbackResult<TResponse>>,
  ): Promise<{ record: AttemptRecord; outcome: CandidateCallbackResult<TResponse> }> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    try {
      const outcome = await runCandidate(candidate, attemptIndex);
      const durationMs = Date.now() - startMs;
      const record: AttemptRecord = {
        attemptIndex,
        provider: candidate.provider,
        model: candidate.model,
        startedAt,
        durationMs,
        status: outcome.status,
        qualityScore:
          outcome.status === 'SUCCESS' || outcome.status === 'RE_ROUTE'
            ? (outcome.qualityScore ?? null)
            : null,
        qualityReasons:
          outcome.status === 'SUCCESS' || outcome.status === 'RE_ROUTE'
            ? outcome.qualityReasons
            : undefined,
        errorMessage:
          outcome.status === 'FAILURE'
            ? (outcome.errorMessage ?? (outcome.error as Error | undefined)?.message ?? null)
            : (outcome.status === 'RE_ROUTE' ? outcome.errorMessage ?? null : null),
        errorCode:
          outcome.status === 'FAILURE' ? (outcome.errorCode ?? null) : null,
      };
      return { record, outcome };
    } catch (error) {
      // Defensive — the callback should not throw, but if it does we
      // still want the attempt recorded so the developer drawer can
      // show "candidate threw uncaught error".
      const durationMs = Date.now() - startMs;
      const errorMessage = (error as Error).message;
      const record: AttemptRecord = {
        attemptIndex,
        provider: candidate.provider,
        model: candidate.model,
        startedAt,
        durationMs,
        status: 'FAILURE',
        qualityScore: null,
        errorMessage,
        errorCode: 'UNCAUGHT_CALLBACK_ERROR',
      };
      this.logger.error(
        `runSingleAttempt: callback threw — provider=${candidate.provider} error=${errorMessage}`,
      );
      return {
        record,
        outcome: { status: 'FAILURE', error, errorMessage, errorCode: 'UNCAUGHT_CALLBACK_ERROR' },
      };
    }
  }
}
