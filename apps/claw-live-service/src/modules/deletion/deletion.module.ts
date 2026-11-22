import { Module } from '@nestjs/common';

import { AccountDeletionConsumer } from './consumers/account-deletion.consumer';
import { DeletionController } from './controllers/deletion.controller';
import { DeletionRepository } from './repositories/deletion.repository';
import { DeletionService } from './services/deletion.service';
import { OrphanRunSweeperService } from './services/orphan-run-sweeper.service';

@Module({
  controllers: [DeletionController],
  providers: [
    AccountDeletionConsumer,
    DeletionRepository,
    DeletionService,
    OrphanRunSweeperService,
  ],
  exports: [DeletionService],
})
export class DeletionModule {}
