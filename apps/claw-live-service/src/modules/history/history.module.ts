import { Module } from '@nestjs/common';

import { PdfRenderClient } from './clients/pdf-render.client';
import { HistoryController } from './controllers/history.controller';
import { HistoryRepository } from './repositories/history.repository';
import { HistoryExportService } from './services/history-export.service';
import { HistoryService } from './services/history.service';

@Module({
  controllers: [HistoryController],
  providers: [HistoryRepository, HistoryService, HistoryExportService, PdfRenderClient],
  exports: [HistoryService, HistoryRepository],
})
export class HistoryModule {}
