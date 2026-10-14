import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { BoardPublicController } from './controllers/board-public.controller';
import { BoardController } from './controllers/board.controller';
import { BoardMaintenanceRepository } from './repositories/board-maintenance.repository';
import { BoardRepository } from './repositories/board.repository';
import { BoardMaintenanceService } from './services/board-maintenance.service';
import { BoardService } from './services/board.service';

@Module({
  imports: [PrismaModule],
  controllers: [BoardController, BoardPublicController],
  providers: [BoardRepository, BoardService, BoardMaintenanceRepository, BoardMaintenanceService],
  exports: [BoardMaintenanceService],
})
export class BoardModule {}
