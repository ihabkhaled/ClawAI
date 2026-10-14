import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { GenerationBudgetCloseStatus } from '../../../common/enums/generation-budget-close-status.enum';
import { ThreadBudgetCloseRefusedError } from '../utilities/thread-budget-close-refused.error';

const reservedBudgetSchema = z.object({
  id: z.string().min(1).max(64),
  userId: z.string().min(1).max(128),
  requestId: z.string().min(1).max(200),
  capMicroUsd: z.number().int().safe(),
  status: z.string(),
});

const budgetSummarySchema = z.object({
  settledMicroUsd: z.number().int().safe().nonnegative(),
  /** Absent (an older auth-service) means the Free meter charged nothing for this job. */
  freeAllowanceMicroUsd: z.number().int().safe().nonnegative().optional().default(0),
});

@Injectable()
export class ThreadBudgetClient {
  async reserve(userId: string, requestId: string, capMicroUsd: number): Promise<{ id: string }> {
    const config = AppConfig.get();
    const url = `${config.AUTH_SERVICE_URL}/api/v1/internal/threads/budgets/reserve`;
    assertSafeRequestUrl(url, declaredHost(config.AUTH_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, requestId, capMicroUsd }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('Threads budget service is unavailable');
    }
    if (response.status === 403) {
      throw new ForbiddenException('Threads generation is not permitted');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Threads budget request failed (${String(response.status)})`,
      );
    }
    const parsed = reservedBudgetSchema.safeParse(await response.json());
    if (
      !parsed.success ||
      parsed.data.userId !== userId ||
      parsed.data.requestId !== requestId ||
      parsed.data.capMicroUsd !== capMicroUsd ||
      parsed.data.status !== 'ACTIVE'
    ) {
      throw new ServiceUnavailableException('Threads budget response is invalid');
    }
    return { id: parsed.data.id };
  }

  async close(budgetId: string, status: GenerationBudgetCloseStatus): Promise<void> {
    const config = AppConfig.get();
    const url = `${config.AUTH_SERVICE_URL}/api/v1/internal/threads/budgets/close`;
    assertSafeRequestUrl(url, declaredHost(config.AUTH_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ budgetId, status }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('Threads budget service is unavailable');
    }
    if (!response.ok) throw new ServiceUnavailableException('Threads budget could not be closed');
    // The budget service answers `true` once closed; `null` (an empty body) means it refused.
    const closed: unknown = await response.json().catch(() => null);
    if (closed !== true) throw new ThreadBudgetCloseRefusedError();
  }

  /**
   * The real money spent on the job (integer micro-USD): what the budget row settled, or what the
   * Free meter charged for the job's calls, whichever is larger (a Free job settles nothing).
   */
  async spentMicroUsd(budgetId: string): Promise<number> {
    const summary = await this.summary(budgetId);
    return Math.max(summary.settledMicroUsd, summary.freeAllowanceMicroUsd);
  }

  private async summary(
    budgetId: string,
  ): Promise<{ settledMicroUsd: number; freeAllowanceMicroUsd: number }> {
    const config = AppConfig.get();
    const url = `${config.AUTH_SERVICE_URL}/api/v1/internal/threads/budgets/summary`;
    assertSafeRequestUrl(url, declaredHost(config.AUTH_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ budgetId }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('Threads budget service is unavailable');
    }
    if (!response.ok) throw new ServiceUnavailableException('Threads budget summary failed');
    const parsed = budgetSummarySchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success)
      throw new ServiceUnavailableException('Threads budget response is invalid');
    return parsed.data;
  }
}
