// SCAFFOLD: stream R.7 (08-r7-i18n-non-english)
// NEW module — NOT yet registered.

import { Module } from '@nestjs/common';

import { LanguageDetectionController } from './controllers/language-detection.controller';
import { CodeMixedDetectorManager } from './managers/code-mixed-detector.manager';
import { LanguageClassifierManager } from './managers/language-classifier.manager';
import { LanguageDetectionService } from './services/language-detection.service';

@Module({
  controllers: [LanguageDetectionController],
  providers: [LanguageDetectionService, LanguageClassifierManager, CodeMixedDetectorManager],
  exports: [LanguageDetectionService],
})
export class LanguageDetectionModule {}
