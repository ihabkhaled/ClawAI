import { Controller, Get } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { HealthService } from './health.service';
import type { HealthReport } from './types/health.types';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check(): Promise<HealthReport> {
    return this.healthService.report();
  }
}
