import { Module } from '@nestjs/common';
import { BinaryModule } from '../binary/binary.module';
import { ModelsLifecycleModule } from '../models-lifecycle/models-lifecycle.module';
import { RuntimeProgressController } from './controllers/runtime-progress.controller';
import { LlamacppProbeService } from './services/llamacpp-probe.service';

@Module({
  imports: [BinaryModule, ModelsLifecycleModule],
  controllers: [RuntimeProgressController],
  providers: [LlamacppProbeService],
  exports: [LlamacppProbeService],
})
export class RuntimeProgressModule {}
