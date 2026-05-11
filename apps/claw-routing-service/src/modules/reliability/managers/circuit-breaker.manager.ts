import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerState } from '../../../common/enums';
import {
  CB_FAILURE_THRESHOLD,
  CB_FAILURE_WINDOW_MS,
  CB_OPEN_DURATION_MS,
} from '../constants/reliability.constants';
import { CircuitBreakerRepository } from '../repositories/circuit-breaker.repository';
import { type CircuitBreakerRecord, type CircuitBreakerSnapshot } from '../types/reliability.types';

@Injectable()
export class CircuitBreakerManager {
  private readonly logger = new Logger(CircuitBreakerManager.name);

  constructor(private readonly repo: CircuitBreakerRepository) {}

  async getState(scope: string, now: Date = new Date()): Promise<CircuitBreakerSnapshot> {
    const record = await this.repo.findByScope(scope);
    if (record === null) {
      return {
        scope,
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        openedAt: null,
        isAvailable: true,
      };
    }
    const adjusted = this.adjustOpenForExpiry(record, now);
    return this.toSnapshot(adjusted);
  }

  async recordFailure(scope: string, now: Date = new Date()): Promise<CircuitBreakerSnapshot> {
    this.logger.warn(`recordFailure scope=${scope}`);
    const existing = await this.repo.findByScope(scope);
    if (existing === null) {
      const saved = await this.repo.upsert(scope, CircuitBreakerState.CLOSED, 1, null);
      return this.toSnapshot(saved);
    }
    if (existing.state === CircuitBreakerState.OPEN) {
      const adjusted = this.adjustOpenForExpiry(existing, now);
      if (adjusted.state === CircuitBreakerState.HALF_OPEN) {
        // failure during HALF_OPEN → re-open
        const saved = await this.repo.upsert(
          scope,
          CircuitBreakerState.OPEN,
          existing.failureCount,
          now,
        );
        return this.toSnapshot(saved);
      }
      return this.toSnapshot(adjusted);
    }

    const withinWindow =
      now.getTime() - existing.lastTransitionAt.getTime() <= CB_FAILURE_WINDOW_MS;
    const newFailureCount = withinWindow ? existing.failureCount + 1 : 1;

    if (newFailureCount >= CB_FAILURE_THRESHOLD) {
      const saved = await this.repo.upsert(scope, CircuitBreakerState.OPEN, newFailureCount, now);
      return this.toSnapshot(saved);
    }

    const saved = await this.repo.upsert(scope, CircuitBreakerState.CLOSED, newFailureCount, null);
    return this.toSnapshot(saved);
  }

  async recordSuccess(scope: string): Promise<CircuitBreakerSnapshot> {
    const existing = await this.repo.findByScope(scope);
    if (existing === null) {
      return {
        scope,
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        openedAt: null,
        isAvailable: true,
      };
    }
    const saved = await this.repo.upsert(scope, CircuitBreakerState.CLOSED, 0, null);
    return this.toSnapshot(saved);
  }

  async manualReset(scope: string): Promise<CircuitBreakerSnapshot> {
    this.logger.log(`manualReset scope=${scope}`);
    const saved = await this.repo.upsert(scope, CircuitBreakerState.CLOSED, 0, null);
    return this.toSnapshot(saved);
  }

  async listAll(): Promise<CircuitBreakerSnapshot[]> {
    const records = await this.repo.listAll();
    return records.map((r) => this.toSnapshot(this.adjustOpenForExpiry(r, new Date())));
  }

  private adjustOpenForExpiry(record: CircuitBreakerRecord, now: Date): CircuitBreakerRecord {
    if (record.state !== CircuitBreakerState.OPEN || record.openedAt === null) return record;
    const elapsed = now.getTime() - record.openedAt.getTime();
    if (elapsed >= CB_OPEN_DURATION_MS) {
      return { ...record, state: CircuitBreakerState.HALF_OPEN };
    }
    return record;
  }

  private toSnapshot(record: CircuitBreakerRecord): CircuitBreakerSnapshot {
    return {
      scope: record.scope,
      state: record.state,
      failureCount: record.failureCount,
      openedAt: record.openedAt,
      isAvailable: record.state !== CircuitBreakerState.OPEN,
    };
  }
}
