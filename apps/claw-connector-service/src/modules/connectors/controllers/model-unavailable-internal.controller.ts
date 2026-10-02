import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type RecordModelUnavailableDto,
  recordModelUnavailableSchema,
} from '../dto/record-model-unavailable.dto';
import { ModelUnavailableService } from '../services/model-unavailable.service';

/**
 * chat-service reports that a provider refused a model as gone (ADR-151). It
 * writes catalog data, so a service token is required; `@Public()` only lifts
 * the user JWT guard.
 */
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/connectors/models/unavailable')
export class ModelUnavailableInternalController {
  constructor(private readonly modelUnavailableService: ModelUnavailableService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async record(
    @Body(new ZodValidationPipe(recordModelUnavailableSchema)) dto: RecordModelUnavailableDto,
  ): Promise<{ counted: number; retired: number }> {
    return this.modelUnavailableService.record(dto);
  }
}
