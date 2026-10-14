import { Injectable } from '@nestjs/common';

import { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import { RATE_WINDOW_MS } from '../constants/runtime.constants';
import { InvocationAuditRepository } from '../repositories/invocation-audit.repository';
import { type LimitSlot } from '../types/invoke.types';

/**
 * Per-user brakes on tool calls, checked before any quota is held. Calls per minute come from the
 * audit table, so every replica sees the same count. Calls in flight are counted in this
 * process: with several replicas the true ceiling is the limit times the replica count, which is
 * still a hard bound on one user's parallel load.
 */
@Injectable()
export class CallLimiterManager {
  private readonly inFlight = new Map<string, number>();

  constructor(private readonly audit: InvocationAuditRepository) {}

  async acquire(
    userId: string,
    limits: { ratePerMinute: number; concurrentPerUser: number },
    now: number = Date.now(),
  ): Promise<LimitSlot> {
    const recent = await this.audit.countSince(userId, new Date(now - RATE_WINDOW_MS));
    if (recent >= limits.ratePerMinute)
      return { ok: false, errorCode: InvokeErrorCode.RATE_LIMITED };
    const active = this.inFlight.get(userId) ?? 0;
    if (active >= limits.concurrentPerUser) {
      return { ok: false, errorCode: InvokeErrorCode.CONCURRENCY_LIMITED };
    }
    this.inFlight.set(userId, active + 1);
    let released = false;
    return {
      ok: true,
      release: (): void => {
        if (released) return;
        released = true;
        const left = (this.inFlight.get(userId) ?? 1) - 1;
        if (left <= 0) this.inFlight.delete(userId);
        else this.inFlight.set(userId, left);
      },
    };
  }
}
