import { Module } from '@nestjs/common';
import { ModelsLifecycleModule } from '../models-lifecycle/models-lifecycle.module';
import { InferenceController } from './controllers/inference.controller';
import { InferenceProxyManager } from './managers/inference-proxy.manager';
import { InferenceService } from './services/inference.service';

@Module({
  imports: [ModelsLifecycleModule],
  controllers: [InferenceController],
  providers: [InferenceService, InferenceProxyManager],
  exports: [InferenceService],
})
export class InferenceModule {}
