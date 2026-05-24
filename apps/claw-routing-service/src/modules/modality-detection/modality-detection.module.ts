// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)
// NEW module — NOT yet imported by app.module.ts. Register only after activation.

import { Module } from '@nestjs/common';

import { ModalityDetectionController } from './controllers/modality-detection.controller';
import { AttachmentIntentManager } from './managers/attachment-intent.manager';
import { EmbeddingIntentManager } from './managers/embedding-intent.manager';
import { StreamingIntentManager } from './managers/streaming-intent.manager';
import { ToolCallingIntentManager } from './managers/tool-calling-intent.manager';
import { UrlIntentManager } from './managers/url-intent.manager';
import { ModalityDetectionService } from './services/modality-detection.service';

@Module({
  controllers: [ModalityDetectionController],
  providers: [
    ModalityDetectionService,
    UrlIntentManager,
    AttachmentIntentManager,
    ToolCallingIntentManager,
    StreamingIntentManager,
    EmbeddingIntentManager,
  ],
  exports: [ModalityDetectionService],
})
export class ModalityDetectionModule {}
