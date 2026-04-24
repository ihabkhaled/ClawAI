import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { SyncHealthService } from '../services/sync-health.service';
import type { InternalSyncHealth } from '../types/sync-health.types';

/**
 * Internal health probe consumed by `claw-health-service`.
 *
 * The route is intentionally outside `/api/v1/` so nginx does NOT proxy it;
 * it is only reachable from inside the Docker network. Marked `@Public()` so
 * the AuthGuard lets service-to-service probe calls through.
 */
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
