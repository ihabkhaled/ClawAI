import { Controller, Get } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { HealthService } from '../services/health.service';
import { type HealthStatus } from '../types/health.types';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  check(): HealthStatus {
    return this.health.check();
  }
}
