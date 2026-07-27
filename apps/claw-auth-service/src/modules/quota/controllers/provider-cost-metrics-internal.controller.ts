import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ProviderCostMetricsService } from '../services/provider-cost-metrics.service';
import { type ProviderCostAggregateView } from '../types/provider-cost.types';
import { type ProviderCostQuery, providerCostQuerySchema } from '../dto/provider-cost-metrics.dto';

@Controller('internal/billing-metrics')
@Public()
@UseGuards(ServiceTokenGuard)
export class ProviderCostMetricsInternalController {
  constructor(private readonly metrics: ProviderCostMetricsService) {}

  @Get('provider-costs')
  async aggregate(
    @Query(new ZodValidationPipe(providerCostQuerySchema)) query: ProviderCostQuery,
  ): Promise<ProviderCostAggregateView[]> {
    return this.metrics.aggregate(new Date(query.from));
  }
}
