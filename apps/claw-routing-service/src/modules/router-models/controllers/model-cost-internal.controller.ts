import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ResolveCostClassesDto,
  resolveCostClassesSchema,
} from '../dto/resolve-cost-classes.dto';
import { ModelCostService } from '../services/model-cost.service';
import { type ResolvedCostClass } from '../types/model-cost-quote.types';
import { type ModelCostSnapshot } from '../types/model-cost.types';

/**
 * Model rates for a sibling SERVICE, not a user.
 *
 * auth-service prices every pay-as-you-go reservation from this route. It used
 * to call the user-facing `/router-models/costs/:provider/:model`, which the
 * global AuthGuard rejects for a service token — so every rate lookup came back
 * 401, auth failed closed, and the product refused every paid model with
 * "credit checks are temporarily unavailable" while wallets sat full.
 *
 * `@Public()` here means "not a USER route", not "unauthenticated": it only
 * lifts the JWT guard so `ServiceTokenGuard` can do the real check. Leaving the
 * rate card genuinely public would have published our provider pricing, which
 * rule 37 forbids.
 */
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/router-models/costs')
export class ModelCostInternalController {
  constructor(private readonly service: ModelCostService) {}

  // Many models' cost classes in one call, for the model picker's plan check. Returns the class
  // band only, never a rate, so the rate card stays private (rule 37).
  @Post('classes')
  async resolveClasses(
    @Body(new ZodValidationPipe(resolveCostClassesSchema)) dto: ResolveCostClassesDto,
  ): Promise<ResolvedCostClass[]> {
    return this.service.resolveCostClasses(dto.models);
  }

  @Get(':provider/:model')
  async get(
    @Param('provider') provider: string,
    @Param('model') model: string,
  ): Promise<ModelCostSnapshot> {
    return this.service.getSnapshot(provider, model);
  }
}
