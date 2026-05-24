// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

import { Body, Controller, Post } from '@nestjs/common';

import { detectModalitySchema, type DetectModalityDto } from '../dto/detect-modality.dto';
import { ModalityDetectionService } from '../services/modality-detection.service';
import type { ModalityDetectionResult } from '../types/modality-detection.types';

@Controller('routing/detect-modality')
export class ModalityDetectionController {
  constructor(private readonly service: ModalityDetectionService) {}

  @Post()
  async detect(@Body() body: unknown): Promise<ModalityDetectionResult> {
    const parsed: DetectModalityDto = detectModalitySchema.parse(body);
    return this.service.detect(parsed);
  }
}
