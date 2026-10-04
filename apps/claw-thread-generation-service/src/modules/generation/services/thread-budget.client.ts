import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';

@Injectable()
export class ThreadBudgetClient {
  async close(budgetId: string, status: 'FINALIZED' | 'RELEASED'): Promise<void> {
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
    if (!response.ok || (await response.json()) !== true) {
      throw new ServiceUnavailableException('Threads budget could not be closed');
    }
  }
}
