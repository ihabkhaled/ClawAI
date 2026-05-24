// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

import { Injectable, Logger } from '@nestjs/common';

import type { ToolCallingIntentResult } from '../types/modality-detection.types';

@Injectable()
export class ToolCallingIntentManager {
  private readonly logger = new Logger(ToolCallingIntentManager.name);

  detect(_message: string): ToolCallingIntentResult {
    this.logger.warn('ToolCallingIntentManager.detect: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R2 — ToolCallingIntentManager.detect not implemented; see docs/15-ai-context/routing-flagship-streams/03-r2-multimodal-intent-detection.md',
    );
  }
}
