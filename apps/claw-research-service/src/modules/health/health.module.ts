import { Module } from '@nestjs/common';

import { FetchModule } from '../fetch/fetch.module';
import { HealthController } from './health.controller';
import { ResearchHealthService } from './services/research-health.service';

@Module({
  imports: [FetchModule],
  controllers: [HealthController],
  providers: [ResearchHealthService],
})
export class HealthModule {}
