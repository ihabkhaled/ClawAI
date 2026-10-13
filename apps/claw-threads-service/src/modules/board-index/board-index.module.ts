import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { BoardIndexRepository } from './repositories/board-index.repository';
import { BoardCountsAdapter } from './services/board-counts.adapter';
import { BoardIndexReconcileService } from './services/board-index-reconcile.service';
import { BoardIndexService } from './services/board-index.service';

@Module({
  imports: [PrismaModule],
  providers: [
    BoardIndexRepository,
    BoardIndexService,
    BoardIndexReconcileService,
    BoardCountsAdapter,
  ],
  exports: [
    BoardIndexService,
    BoardIndexReconcileService,
    BoardIndexRepository,
    BoardCountsAdapter,
  ],
})
export class BoardIndexModule {}
