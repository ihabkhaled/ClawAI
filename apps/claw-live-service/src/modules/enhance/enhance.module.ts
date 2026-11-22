import { Module } from '@nestjs/common';

import { HistoryModule } from '../history/history.module';
import { EnhanceModelClient } from './clients/enhance-model.client';
import { ModelRateClient } from './clients/model-rate.client';
import { EnhanceController } from './controllers/enhance.controller';
import { EnhanceRepository } from './repositories/enhance.repository';
import { EnhanceService } from './services/enhance.service';

@Module({
  imports: [HistoryModule],
  controllers: [EnhanceController],
  providers: [EnhanceRepository, EnhanceService, ModelRateClient, EnhanceModelClient],
})
export class EnhanceModule {}
