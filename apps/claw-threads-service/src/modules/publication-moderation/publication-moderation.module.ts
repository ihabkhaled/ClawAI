import { Module } from '@nestjs/common';

import { BoardIndexModule } from '../board-index/board-index.module';
import { BoardIndexService } from '../board-index/services/board-index.service';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { BOARD_INDEX_PORT } from './ports/board-index.port';
import { PublicationRevokeRepository } from './repositories/publication-revoke.repository';
import { PublicationRevokeService } from './services/publication-revoke.service';

/** BOARD_INDEX_PORT is bound to the Board index service, so a revoke removes the Board row. */
@Module({
  imports: [PrismaModule, BoardIndexModule],
  providers: [
    PublicationRevokeRepository,
    PublicationRevokeService,
    { provide: BOARD_INDEX_PORT, useExisting: BoardIndexService },
  ],
  exports: [PublicationRevokeService],
})
export class PublicationModerationModule {}
