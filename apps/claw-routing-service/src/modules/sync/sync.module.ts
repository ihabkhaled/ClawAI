import { Module } from '@nestjs/common';
import { RouterModelsModule } from '../router-models/router-models.module';
import { RouterSyncController } from './controllers/router-sync.controller';
import { RouterSyncManager } from './managers/router-sync.manager';
import { RouterSyncService } from './services/router-sync.service';

@Module({
  imports: [RouterModelsModule],
  controllers: [RouterSyncController],
  providers: [RouterSyncService, RouterSyncManager],
  exports: [RouterSyncService, RouterSyncManager],
})
export class SyncModule {}
