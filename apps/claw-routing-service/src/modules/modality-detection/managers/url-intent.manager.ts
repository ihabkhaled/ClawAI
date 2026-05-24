// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

import { Injectable, Logger } from '@nestjs/common';

import type { UrlIntentResult } from '../types/modality-detection.types';

@Injectable()
export class UrlIntentManager {
  private readonly logger = new Logger(UrlIntentManager.name);

  detect(_message: string): UrlIntentResult {
    this.logger.warn('UrlIntentManager.detect: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R2 — UrlIntentManager.detect not implemented; see docs/15-ai-context/routing-flagship-streams/03-r2-multimodal-intent-detection.md',
    );
  }
}
