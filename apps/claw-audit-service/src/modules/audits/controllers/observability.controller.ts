import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type FailuresQueryDto,
  failuresQuerySchema,
  type TracingQueryDto,
  tracingQuerySchema,
} from '../dtos/observability-query.dto';
import { ObservabilityService } from '../services/observability.service';
import type { FailuresResponse, TracingResponse } from '../types/observability.types';

/**
 * Recent-window failures and metadata-only tracing for the admin
 * Observability page. Both routes are bounded and never return prompts,
 * responses, keys or headers.
 */
@Controller()
export class ObservabilityController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get('audits/failures')
  @RequirePermissions(Permission.ADMIN_SYSTEM_VIEW)
  async getFailures(
    @Query(new ZodValidationPipe(failuresQuerySchema)) query: FailuresQueryDto,
  ): Promise<FailuresResponse> {
    return this.observability.getFailures({ ...query, search: query.search ?? null });
  }

  @Get('usage/tracing')
  @RequirePermissions(Permission.ADMIN_USAGE_VIEW)
  async getTracing(
    @Query(new ZodValidationPipe(tracingQuerySchema)) query: TracingQueryDto,
  ): Promise<TracingResponse> {
    return this.observability.getTracing({ ...query, search: query.search ?? null });
  }
}
