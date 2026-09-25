import { Controller, Get } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

import { ResearchHealthService } from './services/research-health.service';
import type { ResearchHealthResponse } from './types/health.types';

@Controller('health')
export class HealthController {
  constructor(private readonly health: ResearchHealthService) {}

  @Public()
  @Get()
  async check(): Promise<ResearchHealthResponse> {
    return this.health.check();
  }
}
