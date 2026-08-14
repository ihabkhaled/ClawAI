import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { CandidateScoreRecord, ProviderAttemptRecord } from '../types/router-attempt.types';

@Injectable()
export class RouterAttemptRepository {
  private readonly logger = new Logger(RouterAttemptRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists every attempt of one routing walk.
   *
   * Written as a single createMany so a partial walk cannot leave a half-recorded
   * trace, and with skipDuplicates so a retried publish of the same trace is
   * idempotent rather than a unique violation on (traceId, attemptOrder).
   *
   * Recording is best effort by design: a decision that succeeded must not be
   * failed retroactively because its audit trail could not be written. The
   * failure is logged with the traceId so the gap is discoverable.
   */
  async recordAttempts(attempts: readonly ProviderAttemptRecord[]): Promise<number> {
    if (attempts.length === 0) {
      return 0;
    }

    try {
      const result = await this.prisma.routerProviderAttempt.createMany({
        data: attempts.map((attempt) => ({
          traceId: attempt.traceId,
          decisionId: attempt.decisionId,
          attemptOrder: attempt.attemptOrder,
          chainEntryId: attempt.chainEntryId,
          chainOrder: attempt.chainOrder,
          provider: attempt.provider,
          providerModelId: attempt.providerModelId,
          deploymentId: attempt.deploymentId,
          succeeded: attempt.succeeded,
          errorCode: attempt.errorCode,
          safeMessage: attempt.safeMessage,
          wasRepair: attempt.wasRepair,
          latencyMs: attempt.latencyMs,
          inputTokens: attempt.inputTokens,
          outputTokens: attempt.outputTokens,
        })),
        skipDuplicates: true,
      });
      this.logger.debug(
        `recordAttempts: wrote ${String(result.count)} of ${String(attempts.length)} for trace=${attempts[0]?.traceId ?? 'unknown'}`,
      );
      return result.count;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(
        `recordAttempts: failed for trace=${attempts[0]?.traceId ?? 'unknown'} - ${message}`,
      );
      return 0;
    }
  }

  /** Persists the candidate ranking behind one decision. Same best-effort contract. */
  async recordCandidateScores(scores: readonly CandidateScoreRecord[]): Promise<number> {
    if (scores.length === 0) {
      return 0;
    }

    try {
      const result = await this.prisma.routingCandidateScore.createMany({
        data: scores.map((score) => ({
          traceId: score.traceId,
          decisionId: score.decisionId,
          deploymentId: score.deploymentId,
          provider: score.provider,
          providerModelId: score.providerModelId,
          eligible: score.eligible,
          exclusionReason: score.exclusionReason,
          score: score.score === null ? null : new Prisma.Decimal(score.score),
          uncertainty: score.uncertainty === null ? null : new Prisma.Decimal(score.uncertainty),
          factors: score.factors ?? Prisma.JsonNull,
          rank: score.rank,
        })),
        skipDuplicates: true,
      });
      this.logger.debug(`recordCandidateScores: wrote ${String(result.count)} rows`);
      return result.count;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`recordCandidateScores: failed - ${message}`);
      return 0;
    }
  }

  /**
   * Links a trace's attempts and scores to the decision once it exists.
   *
   * Attempts are written during the walk, before a decision row can exist —
   * including walks that never produce one. This backfills the association
   * afterwards rather than losing the trace.
   */
  async attachDecision(traceId: string, decisionId: string): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.routerProviderAttempt.updateMany({
          where: { traceId, decisionId: null },
          data: { decisionId },
        }),
        this.prisma.routingCandidateScore.updateMany({
          where: { traceId, decisionId: null },
          data: { decisionId },
        }),
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`attachDecision: failed for trace=${traceId} - ${message}`);
    }
  }

  /** Every attempt of one trace, in the order they were made. */
  async findAttemptsByTrace(traceId: string): Promise<ProviderAttemptRecord[]> {
    const rows = await this.prisma.routerProviderAttempt.findMany({
      where: { traceId },
      orderBy: { attemptOrder: 'asc' },
    });

    return rows.map((row) => ({
      traceId: row.traceId,
      decisionId: row.decisionId,
      attemptOrder: row.attemptOrder,
      chainEntryId: row.chainEntryId,
      chainOrder: row.chainOrder,
      provider: row.provider,
      providerModelId: row.providerModelId,
      deploymentId: row.deploymentId,
      succeeded: row.succeeded,
      errorCode: row.errorCode,
      safeMessage: row.safeMessage,
      wasRepair: row.wasRepair,
      latencyMs: row.latencyMs,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
    }));
  }
}
