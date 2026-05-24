import { Module } from '@nestjs/common';
import { ContextPreviewController } from './controllers/context-preview.controller';
import { ContextPreviewService } from './services/context-preview.service';

@Module({
  controllers: [ContextPreviewController],
  providers: [ContextPreviewService],
})
export class ContextPreviewModule {}
