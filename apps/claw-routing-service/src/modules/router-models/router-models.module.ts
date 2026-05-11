import { Module } from '@nestjs/common';
import { RouterModelsController } from './controllers/router-models.controller';
import { RouterModelsService } from './services/router-models.service';
import { RouterModelRegistryManager } from './managers/router-model-registry.manager';
import { RouterModelRegistryRepository } from './repositories/router-model-registry.repository';
import { RouterAdminOverrideRepository } from './repositories/router-admin-override.repository';

@Module({
  controllers: [RouterModelsController],
  providers: [
    RouterModelsService,
    RouterModelRegistryManager,
    RouterModelRegistryRepository,
    RouterAdminOverrideRepository,
  ],
  exports: [RouterModelsService, RouterModelRegistryManager, RouterModelRegistryRepository],
})
export class RouterModelsModule {}
