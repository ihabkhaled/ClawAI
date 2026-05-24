// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

import { Injectable, Logger } from '@nestjs/common';

import type { StreamingIntentResult } from '../types/modality-detection.types';

@Injectable()
export class StreamingIntentManager {
  private readonly logger = new Logger(StreamingIntentManager.name);

  detect(_clientStreamingExpected: boolean | undefined): StreamingIntentResult {
    this.logger.warn('StreamingIntentManager.detect: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R2 — StreamingIntentManager.detect not implemented; see docs/15-ai-context/routing-flagship-streams/03-r2-multimodal-intent-detection.md',
    );
  }
}
