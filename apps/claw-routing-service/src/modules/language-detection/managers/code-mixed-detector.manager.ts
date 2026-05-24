// SCAFFOLD: stream R.7 (08-r7-i18n-non-english)

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CodeMixedDetectorManager {
  private readonly logger = new Logger(CodeMixedDetectorManager.name);

  detect(_message: string, _primaryLang: string): { isCodeMixed: boolean; secondaryLang?: string } {
    this.logger.warn('CodeMixedDetectorManager.detect: SCAFFOLD only');
    throw new Error(
      'SCAFFOLD-R7 — CodeMixedDetectorManager.detect not implemented; see docs/15-ai-context/routing-flagship-streams/08-r7-i18n-non-english.md',
    );
  }
}
