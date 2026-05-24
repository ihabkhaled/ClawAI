// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

import { Injectable, Logger } from '@nestjs/common';

import { AttachmentIntentManager } from '../managers/attachment-intent.manager';
import { EmbeddingIntentManager } from '../managers/embedding-intent.manager';
import { StreamingIntentManager } from '../managers/streaming-intent.manager';
import { ToolCallingIntentManager } from '../managers/tool-calling-intent.manager';
import { UrlIntentManager } from '../managers/url-intent.manager';
import type { DetectModalityDto } from '../dto/detect-modality.dto';
import type { ModalityDetectionResult } from '../types/modality-detection.types';

@Injectable()
export class ModalityDetectionService {
  private readonly logger = new Logger(ModalityDetectionService.name);

  constructor(
    private readonly urlIntent: UrlIntentManager,
    private readonly attachmentIntent: AttachmentIntentManager,
    private readonly toolCallingIntent: ToolCallingIntentManager,
    private readonly streamingIntent: StreamingIntentManager,
    private readonly embeddingIntent: EmbeddingIntentManager,
  ) {}

  async detect(_input: DetectModalityDto): Promise<ModalityDetectionResult> {
    // Reference each injected manager so the unused-private-check passes
    // until the real implementation wires them up.
    void this.urlIntent;
    void this.attachmentIntent;
    void this.toolCallingIntent;
    void this.streamingIntent;
    void this.embeddingIntent;

    this.logger.warn('ModalityDetectionService.detect: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R2 — ModalityDetectionService.detect not implemented; see docs/15-ai-context/routing-flagship-streams/03-r2-multimodal-intent-detection.md',
    );
  }
}
