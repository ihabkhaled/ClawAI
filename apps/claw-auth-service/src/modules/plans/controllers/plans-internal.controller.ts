import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ActivePriceQueryDto,
  activePriceQuerySchema,
  type PriceVersionParamDto,
  priceVersionParamSchema,
} from '../dto/plan-catalog.dto';
import { PlanCatalogService } from '../services/plan-catalog.service';
import { type PlanCatalogEntry, type PlanPriceVersionView } from '../types/plan-catalog.types';
import {
  type RetirementMigrationOutcomeDto,
  retirementMigrationOutcomeSchema,
  type RetirementMigrationQueryDto,
  retirementMigrationQuerySchema,
} from '../dto/plan-retirement.dto';
import { PlansService } from '../services/plans.service';
import { type PendingPlanRetirementMigration } from '../types/plans.types';

/**
 * The price source of truth for the payment service.
 *
 * `@Public()` removes the user-JWT requirement — the caller is a service acting
 * on nobody's behalf — but `ServiceTokenGuard` then requires the shared
 * inter-service secret. The two together mean this is service-authenticated,
 * not unauthenticated. Not routed through nginx.
 */
@Controller('internal/plans')
@Public()
@UseGuards(ServiceTokenGuard)
export class PlansInternalController {
  constructor(
    private readonly catalog: PlanCatalogService,
    private readonly plans: PlansService,
  ) {}

  @Get('catalog')
  async listCatalog(): Promise<PlanCatalogEntry[]> {
    return this.catalog.listCatalog();
  }

  @Get('price')
  async findActivePrice(
    @Query(new ZodValidationPipe(activePriceQuerySchema)) query: ActivePriceQueryDto,
  ): Promise<PlanPriceVersionView | null> {
    return this.catalog.findActivePrice(query.planId, query.billingInterval);
  }

  @Get('price-versions/:id')
  async findPriceVersion(
    @Param(new ZodValidationPipe(priceVersionParamSchema)) params: PriceVersionParamDto,
  ): Promise<PlanPriceVersionView | null> {
    return this.catalog.findPriceVersion(params.id);
  }

  @Get('retirement-migrations/pending')
  async pendingRetirementMigrations(
    @Query(new ZodValidationPipe(retirementMigrationQuerySchema))
    query: RetirementMigrationQueryDto,
  ): Promise<PendingPlanRetirementMigration[]> {
    return this.plans.listPendingRetirementMigrations(query.limit);
  }

  @Post('retirement-migrations/:id/outcome')
  async recordRetirementMigrationOutcome(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(retirementMigrationOutcomeSchema))
    dto: RetirementMigrationOutcomeDto,
  ): Promise<{ applied: boolean }> {
    return this.plans.recordRetirementMigrationOutcome(id, dto.status, dto.errorCode);
  }
}
