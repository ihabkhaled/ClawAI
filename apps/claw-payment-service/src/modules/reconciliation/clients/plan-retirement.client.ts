import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { RECONCILIATION_BATCH_SIZE } from '../constants/reconciliation.constants';
import { PlanRetirementMigrationStatus } from '../enums/plan-retirement-migration-status.enum';
import {
  pendingPlanRetirementMigrationsSchema,
  planRetirementOutcomeResponseSchema,
} from '../schemas/plan-retirement.schema';
import type { PendingPlanRetirementMigration } from '../types/plan-retirement.types';

const REQUEST_TIMEOUT_MS = 5_000;
const PENDING_PATH = '/api/v1/internal/plans/retirement-migrations/pending';
const OUTCOME_PATH = '/api/v1/internal/plans/retirement-migrations';

@Injectable()
export class PlanRetirementClient {
  private readonly logger = new Logger(PlanRetirementClient.name);

  async listPending(): Promise<PendingPlanRetirementMigration[]> {
    this.logger.debug('listPending');
    const query = new URLSearchParams({ limit: String(RECONCILIATION_BATCH_SIZE) });
    const response = await this.request(HttpMethod.GET, `${PENDING_PATH}?${query.toString()}`);
    const parsed = pendingPlanRetirementMigrationsSchema.safeParse(response);
    if (!parsed.success) {
      this.logger.error('listPending: auth response failed schema validation');
      throw new Error('PLAN_RETIREMENT_CONTRACT_INVALID');
    }
    return parsed.data;
  }

  async recordOutcome(
    id: string,
    status: PlanRetirementMigrationStatus,
    errorCode?: string,
  ): Promise<boolean> {
    this.logger.debug(`recordOutcome: migration=${id} status=${status}`);
    const body = errorCode === undefined ? { status } : { status, errorCode };
    const response = await this.request(
      HttpMethod.POST,
      `${OUTCOME_PATH}/${encodeURIComponent(id)}/outcome`,
      body,
    );
    const parsed = planRetirementOutcomeResponseSchema.safeParse(response);
    if (!parsed.success) {
      this.logger.error('recordOutcome: auth response failed schema validation');
      throw new Error('PLAN_RETIREMENT_CONTRACT_INVALID');
    }
    return parsed.data.applied;
  }

  private async request(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
    const config = AppConfig.get();
    const response = await httpRequest<unknown>({
      url: `${config.AUTH_SERVICE_URL}${path}`,
      method,
      headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
      timeoutMs: REQUEST_TIMEOUT_MS,
      body,
    });
    if (!response.ok) {
      this.logger.error(`request: auth-service returned status=${String(response.status)}`);
      throw new Error('PLAN_RETIREMENT_AUTH_UNAVAILABLE');
    }
    return response.data;
  }
}
