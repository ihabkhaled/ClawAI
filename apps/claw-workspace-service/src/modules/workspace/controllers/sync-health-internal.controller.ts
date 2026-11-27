import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { SyncHealthService } from '../services/sync-health.service';
import type { InternalSyncHealth } from '../types/sync-health.types';

/**
 * Internal sync-health read for sibling services.
 *
 * Not a container probe: Docker healthchecks, health-service and Prometheus all
 * hit `/api/v1/health` or `/api/v1/metrics`, and nothing in the repo calls this
 * route today (checked 2026-11-27). So it takes the service token like every
 * other `internal/*` route; `@Public()` only lifts the user JWT. nginx not
 * proxying `/api/v1/internal/*` is a network fact, not an authorisation.
 */
@UseGuards(ServiceTokenGuard)
@Controller('internal/workspace/sync')
export class SyncHealthInternalController {
  constructor(private readonly service: SyncHealthService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @Public()
  async getHealth(): Promise<InternalSyncHealth> {
    return this.service.getInternalHealth();
  }
}
