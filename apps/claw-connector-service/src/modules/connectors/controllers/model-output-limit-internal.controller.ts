import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type RecordOutputLimitDto, recordOutputLimitSchema } from '../dto/record-output-limit.dto';
import { ModelOutputLimitService } from '../services/model-output-limit.service';

/**
 * chat-service reports an output ceiling a provider stated while refusing a
 * request (ADR-125). It writes catalog data, so a service token is required;
 * `@Public()` only lifts the user JWT guard.
 */
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/connectors/models/output-limit')
export class ModelOutputLimitInternalController {
  constructor(private readonly modelOutputLimitService: ModelOutputLimitService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async record(
    @Body(new ZodValidationPipe(recordOutputLimitSchema)) dto: RecordOutputLimitDto,
  ): Promise<{ updated: number }> {
    return this.modelOutputLimitService.recordLearned(dto);
  }
}
