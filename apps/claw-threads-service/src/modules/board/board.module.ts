import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { BoardController } from './controllers/board.controller';
import { BoardRepository } from './repositories/board.repository';
import { BoardService } from './services/board.service';

@Module({
  imports: [PrismaModule],
  controllers: [BoardController],
  providers: [BoardRepository, BoardService],
})
export class BoardModule {}
