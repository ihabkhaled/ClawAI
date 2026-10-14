import { Controller, Get, Headers } from '@nestjs/common';
import { HealthService } from '../services/health.service';
import { AggregatedHealth, PublicAggregatedHealth } from '../types/health.types';
import { isAdminAuthorization, toPublicHealth } from '../utilities/public-health.utility';

/**
 * `GET /health` stays unauthenticated (container healthchecks, the status
 * badge). Anonymous callers get overall status and per-service up/down only;
 * an admin bearer token gets the full report with errors and timings.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(
    @Headers('authorization') authorization?: string,
  ): Promise<AggregatedHealth | PublicAggregatedHealth> {
    const health = await this.healthService.checkAll();
    return isAdminAuthorization(authorization, process.env['JWT_SECRET'])
      ? health
      : toPublicHealth(health);
  }
}
