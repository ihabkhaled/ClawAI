import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { BoardController } from './controllers/board.controller';
import { BoardMaintenanceRepository } from './repositories/board-maintenance.repository';
import { BoardRepository } from './repositories/board.repository';
import { BoardMaintenanceService } from './services/board-maintenance.service';
import { BoardService } from './services/board.service';

@Module({
  imports: [PrismaModule],
  controllers: [BoardController],
  providers: [BoardRepository, BoardService, BoardMaintenanceRepository, BoardMaintenanceService],
  exports: [BoardMaintenanceService],
})
export class BoardModule {}
