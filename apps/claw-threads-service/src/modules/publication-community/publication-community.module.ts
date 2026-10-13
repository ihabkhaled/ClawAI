import { Module } from '@nestjs/common';

import { BoardCountsAdapter } from '../board-index/services/board-counts.adapter';
import { BoardIndexModule } from '../board-index/board-index.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { BOARD_COUNTS_PORT } from './ports/board-counts.port';
import { CommentRateRepository } from './repositories/comment-rate.repository';
import { CommentRateLimitService } from './services/comment-rate-limit.service';

/** BOARD_COUNTS_PORT is bound to the Board counts adapter and exported to PublicationsModule. */
@Module({
  imports: [PrismaModule, BoardIndexModule],
  providers: [
    CommentRateRepository,
    CommentRateLimitService,
    { provide: BOARD_COUNTS_PORT, useExisting: BoardCountsAdapter },
  ],
  exports: [CommentRateLimitService, BOARD_COUNTS_PORT],
})
export class PublicationCommunityModule {}
