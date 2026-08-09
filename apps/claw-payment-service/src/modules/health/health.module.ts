import { Module } from '@nestjs/common';
import { GatewayConfigModule } from '../gateway-config/gateway-config.module';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [GatewayConfigModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
