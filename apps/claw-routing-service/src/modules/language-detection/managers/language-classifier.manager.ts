// SCAFFOLD: stream R.7 (08-r7-i18n-non-english)

import { Injectable, Logger } from '@nestjs/common';

import type { LanguageDetectionResult } from '../types/language-detection.types';

@Injectable()
export class LanguageClassifierManager {
  private readonly logger = new Logger(LanguageClassifierManager.name);

  classify(_message: string): LanguageDetectionResult {
    this.logger.warn('LanguageClassifierManager.classify: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R7 — LanguageClassifierManager.classify not implemented; see docs/15-ai-context/routing-flagship-streams/08-r7-i18n-non-english.md',
    );
  }
}
