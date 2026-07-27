import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { BillingException } from '../../../common/errors';
import { type ProviderCostMetric } from '../types/billing-dashboard.types';

const providerCostResponseSchema = z.array(
  z.object({
    planId: z.string().nullable(),
    costMicroUsd: z.string().regex(/^\d+$/u),
  }),
);

@Injectable()
export class ProviderCostClient {
  private readonly logger = new Logger(ProviderCostClient.name);

  async aggregate(from: Date): Promise<ProviderCostMetric[]> {
    const config = AppConfig.get();
    const query = new URLSearchParams({ from: from.toISOString() }).toString();
    try {
      const response = await httpRequest<unknown>({
        url: `${config.AUTH_SERVICE_URL}/api/v1/internal/billing-metrics/provider-costs?${query}`,
        method: HttpMethod.GET,
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        timeoutMs: 5_000,
      });
      const parsed = providerCostResponseSchema.safeParse(response.data);
      if (!response.ok || !parsed.success) {
        throw new BillingException(BillingErrorCode.PLAN_CATALOG_UNAVAILABLE);
      }
      return parsed.data;
    } catch (error: unknown) {
      this.logger.error(
        `aggregate: provider costs unavailable — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new BillingException(BillingErrorCode.PLAN_CATALOG_UNAVAILABLE);
    }
  }
}
