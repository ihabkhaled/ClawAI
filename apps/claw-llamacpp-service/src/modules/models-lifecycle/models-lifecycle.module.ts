import { Module } from '@nestjs/common';
import { LlamacppEventsModule } from '../../common/events/llamacpp-events.module';
import { BinaryModule } from '../binary/binary.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ModelsLifecycleController } from './controllers/models-lifecycle.controller';
import { LlamaServerLauncherManager } from './managers/llama-server-launcher.manager';
import { ProcessSupervisorManager } from './managers/process-supervisor.manager';
import { RuntimeConfigManager } from './managers/runtime-config.manager';
import { LoadEventsRepository } from './repositories/load-events.repository';
import { ModelsLifecycleService } from './services/models-lifecycle.service';

@Module({
  imports: [BinaryModule, CatalogModule, LlamacppEventsModule],
  controllers: [ModelsLifecycleController],
  providers: [
    ModelsLifecycleService,
    LlamaServerLauncherManager,
    ProcessSupervisorManager,
    RuntimeConfigManager,
    LoadEventsRepository,
  ],
  exports: [ModelsLifecycleService, LoadEventsRepository, ProcessSupervisorManager],
})
export class ModelsLifecycleModule {}
