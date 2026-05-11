import { Controller, Get, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ObservabilityService } from '../services/observability.service';
import {
  type ObservabilityQueryDto,
  observabilityQuerySchema,
} from '../dto/observability-query.dto';
import { type ObservabilitySummary } from '../types/observability.types';

@Controller('routing/observability')
export class ObservabilityController {
  constructor(private readonly service: ObservabilityService) {}

  @Get('summary')
  async summary(
    @Query(new ZodValidationPipe(observabilityQuerySchema))
    query: ObservabilityQueryDto,
  ): Promise<ObservabilitySummary> {
    return this.service.summary({ from: query.from, to: query.to });
  }
}
