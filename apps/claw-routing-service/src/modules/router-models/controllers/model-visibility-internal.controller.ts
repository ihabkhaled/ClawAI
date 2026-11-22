import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ModelVisibilityQueryDto,
  modelVisibilityQuerySchema,
} from '../dto/model-visibility-query.dto';
import { ModelVisibilityService } from '../services/model-visibility.service';
import { type ModelVisibilitySnapshot } from '../types/model-visibility.types';

/**
 * Registry, router-only and price gates for one model, for connector-service's
 * admin "why hidden?" diagnostic. `@Public()` lifts the user JWT guard only;
 * `ServiceTokenGuard` does the real check, like the cost route next to it.
 */
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/router-models/visibility')
export class ModelVisibilityInternalController {
  constructor(private readonly service: ModelVisibilityService) {}

  @Get()
  async get(
    @Query(new ZodValidationPipe(modelVisibilityQuerySchema)) query: ModelVisibilityQueryDto,
  ): Promise<ModelVisibilitySnapshot> {
    return this.service.get(query.provider, query.model);
  }
}
