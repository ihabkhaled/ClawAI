// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

import { Injectable, Logger } from '@nestjs/common';

import type { EmbeddingIntentResult } from '../types/modality-detection.types';

@Injectable()
export class EmbeddingIntentManager {
  private readonly logger = new Logger(EmbeddingIntentManager.name);

  detect(_message: string): EmbeddingIntentResult {
    this.logger.warn('EmbeddingIntentManager.detect: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R2 — EmbeddingIntentManager.detect not implemented; see docs/15-ai-context/routing-flagship-streams/03-r2-multimodal-intent-detection.md',
    );
  }
}
