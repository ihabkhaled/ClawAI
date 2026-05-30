import { Module } from '@nestjs/common';
import { RuntimeProgressController } from './controllers/runtime-progress.controller';
import { OllamaProbeService } from './services/ollama-probe.service';

@Module({
  controllers: [RuntimeProgressController],
  providers: [OllamaProbeService],
  exports: [OllamaProbeService],
})
export class RuntimeProgressModule {}
