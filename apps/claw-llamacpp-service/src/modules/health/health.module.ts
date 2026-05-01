import { Module } from '@nestjs/common';
import { BinaryModule } from '../binary/binary.module';
import { ModelsLifecycleModule } from '../models-lifecycle/models-lifecycle.module';
import { HealthController } from './controllers/health.controller';
import { HealthService } from './services/health.service';

@Module({
  imports: [BinaryModule, ModelsLifecycleModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
