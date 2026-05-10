import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ClassifierService } from '../services/classifier.service';
import { type ClassifyDto, classifySchema } from '../dto/classify.dto';
import { type ClassificationResult } from '../types/classification.types';

@Controller('routing/classify')
export class ClassifierController {
  constructor(private readonly service: ClassifierService) {}

  @Post()
  classify(@Body(new ZodValidationPipe(classifySchema)) dto: ClassifyDto): ClassificationResult {
    return this.service.classify(dto);
  }
}
