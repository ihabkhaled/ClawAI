import { Controller, Get } from '@nestjs/common';
import { Public } from '@claw/shared-auth';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: string; service: string } {
    return { status: 'ok', service: 'agent-service' };
  }
}
