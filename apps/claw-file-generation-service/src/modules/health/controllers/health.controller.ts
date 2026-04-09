import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { HealthService } from '../services/health.service';
import { type HealthStatus } from '../types/health.types';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  async check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
