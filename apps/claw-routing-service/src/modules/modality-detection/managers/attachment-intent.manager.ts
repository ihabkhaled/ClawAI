// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

import { Injectable, Logger } from '@nestjs/common';

import type {
  AttachmentIntentResult,
  AttachmentMeta,
} from '../types/modality-detection.types';

@Injectable()
export class AttachmentIntentManager {
  private readonly logger = new Logger(AttachmentIntentManager.name);

  detect(_message: string, _attachments: AttachmentMeta[]): AttachmentIntentResult {
    this.logger.warn('AttachmentIntentManager.detect: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R2 — AttachmentIntentManager.detect not implemented; see docs/15-ai-context/routing-flagship-streams/03-r2-multimodal-intent-detection.md',
    );
  }
}
