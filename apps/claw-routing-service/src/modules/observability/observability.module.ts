import { Module } from '@nestjs/common';
import { ObservabilityController } from './controllers/observability.controller';
import { ObservabilityService } from './services/observability.service';

@Module({
  controllers: [ObservabilityController],
  providers: [ObservabilityService],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
