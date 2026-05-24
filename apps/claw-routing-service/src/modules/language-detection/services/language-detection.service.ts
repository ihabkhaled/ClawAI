// SCAFFOLD: stream R.7 (08-r7-i18n-non-english)

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LanguageDetectionService {
  private readonly logger = new Logger(LanguageDetectionService.name);

  async detect(_body: unknown): Promise<unknown> {
    this.logger.warn('LanguageDetectionService.detect: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R7 — LanguageDetectionService.detect not implemented; see docs/15-ai-context/routing-flagship-streams/08-r7-i18n-non-english.md',
    );
  }
}
