import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { CreditHeadroomService } from '../services/credit-headroom.service';
import { type ProviderCreditHeadroom } from '../types/credit-headroom.types';

/**
 * The executing key's remaining provider credit, for chat-service's pre-flight
 * `max_tokens` cap.
 *
 * `@Public()` only lifts the USER JWT guard; `ServiceTokenGuard` is the real
 * check. Unlike its `@Public()` siblings on `internal/connectors`, this route
 * answers with money — the operator's balance at a provider — so a service
 * token is required even though nginx does not proxy `/api/v1/internal/*`.
 */
@Public()
@UseGuards(ServiceTokenGuard)
@Controller('internal/connectors/credit-headroom')
export class CreditHeadroomInternalController {
  constructor(private readonly creditHeadroomService: CreditHeadroomService) {}

  @Get()
  async get(@Query('provider') provider: string): Promise<ProviderCreditHeadroom> {
    return this.creditHeadroomService.getCreditHeadroom(provider);
  }
}
