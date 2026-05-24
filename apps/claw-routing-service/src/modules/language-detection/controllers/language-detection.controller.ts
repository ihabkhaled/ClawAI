// SCAFFOLD: stream R.7 (08-r7-i18n-non-english)

import { Body, Controller, Post } from '@nestjs/common';

import { LanguageDetectionService } from '../services/language-detection.service';

@Controller('routing/detect-language')
export class LanguageDetectionController {
  constructor(private readonly service: LanguageDetectionService) {}

  @Post()
  async detect(@Body() body: unknown): Promise<unknown> {
    return this.service.detect(body);
  }
}
