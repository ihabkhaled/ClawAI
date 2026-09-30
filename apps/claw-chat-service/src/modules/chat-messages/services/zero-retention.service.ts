import { HttpStatus, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { BusinessException } from '../../../common/errors';
import { ZERO_RETENTION_PURGE_STATUSES } from '../constants/zero-retention.constants';
import { RuntimeV2Store } from '../repositories/runtime-v2.store';
import { ZeroRetentionMarkerStore } from '../repositories/zero-retention-marker.store';
import { ZeroRetentionRepository } from '../repositories/zero-retention.repository';
import type { RuntimeV2TerminalNotice } from '../types/runtime-v2-terminal-listener.types';
import type { ZeroRetentionTurnFilter } from '../types/zero-retention.types';
import { zeroRetentionErrorName } from '../utilities/zero-retention.utility';

/**
 * Zero data retention, server side (F055).
 *
 * A request carrying `X-Claw-Zero-Retention: 1` marks its turn; when the turn
 * is over for good its messages lose their content (see
 * `ZeroRetentionRepository`). Nothing is purged mid-turn: a Runtime V2 run
 * re-reads its own transcript between tool calls, and a paused run resumes
 * from it, so the purge waits for `completed`, `failed` or `cancelled`.
 *
 * Logs carry identifiers and counts only — never content.
 */
@Injectable()
export class ZeroRetentionService implements OnModuleInit {
  private readonly logger = new Logger(ZeroRetentionService.name);

  constructor(
    private readonly markers: ZeroRetentionMarkerStore,
    private readonly repository: ZeroRetentionRepository,
    private readonly runtimeStore: RuntimeV2Store,
  ) {}

  onModuleInit(): void {
    this.runtimeStore.onTerminal(async (notice) => this.purgeRuntimeRun(notice));
  }

  /**
   * Marks a chat turn. A turn that asked and cannot be marked is refused, and
   * its prompt is redacted now: answering it would promise retention we could
   * not keep.
   */
  async markChatTurn(threadId: string, userMessageId: string): Promise<void> {
    try {
      await this.markers.markTurn(userMessageId);
    } catch (error: unknown) {
      this.logger.error(
        `markChatTurn: marker failed for ${userMessageId}: ${zeroRetentionErrorName(error)}`,
      );
      await this.redact({ threadId, userMessageId });
      throw this.unavailable();
    }
  }

  /** Marks a Runtime V2 run before it is published, so its terminal event always finds the mark. */
  async markRuntimeRun(runId: string): Promise<void> {
    try {
      await this.markers.markRun(runId);
    } catch (error: unknown) {
      this.logger.error(
        `markRuntimeRun: marker failed for run ${runId}: ${zeroRetentionErrorName(error)}`,
      );
      throw this.unavailable();
    }
  }

  /** Whether a routed chat turn asked for zero retention. A Redis fault reads as "no", loudly. */
  async isChatTurnMarked(userMessageId: string): Promise<boolean> {
    try {
      return await this.markers.isTurnMarked(userMessageId);
    } catch (error: unknown) {
      this.logger.error(
        `isChatTurnMarked: lookup failed for ${userMessageId}: ${zeroRetentionErrorName(error)}`,
      );
      return false;
    }
  }

  /** Purges a finished chat turn. Never throws. */
  async purgeChatTurn(threadId: string, userMessageId: string): Promise<void> {
    await this.redact({ threadId, userMessageId });
  }

  /** Terminal listener for Runtime V2. Never throws. */
  async purgeRuntimeRun(notice: RuntimeV2TerminalNotice): Promise<void> {
    if (!ZERO_RETENTION_PURGE_STATUSES.includes(notice.status)) return;
    try {
      if (!(await this.markers.isRunMarked(notice.runId))) return;
    } catch (error: unknown) {
      this.logger.error(
        `purgeRuntimeRun: lookup failed for run ${notice.runId}: ${zeroRetentionErrorName(error)}`,
      );
      return;
    }
    await this.redact({ threadId: notice.threadId, runId: notice.runId });
  }

  private unavailable(): BusinessException {
    return new BusinessException(
      'Zero data retention cannot be guaranteed right now',
      'ZERO_RETENTION_UNAVAILABLE',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private async redact(filter: ZeroRetentionTurnFilter): Promise<void> {
    const subject = 'runId' in filter ? `run ${filter.runId}` : `turn ${filter.userMessageId}`;
    try {
      const count = await this.repository.redactTurn(filter);
      this.logger.log(`zero retention: redacted ${String(count)} message(s) of ${subject}`);
    } catch (error: unknown) {
      this.logger.error(
        `zero retention: redaction failed for ${subject}: ${zeroRetentionErrorName(error)}`,
      );
    }
  }
}
