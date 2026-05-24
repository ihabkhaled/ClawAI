import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type BulkApproveCapabilityDto,
  bulkApproveCapabilitySchema,
} from '../dto/bulk-approve-capability.dto';
import {
  type CancelCapabilityDto,
  cancelCapabilitySchema,
} from '../dto/cancel-capability.dto';
import {
  type ListCapabilitiesQueryDto,
  listCapabilitiesQuerySchema,
} from '../dto/list-capabilities-query.dto';
import {
  type ProposeCapabilityDto,
  proposeCapabilitySchema,
} from '../dto/propose-capability.dto';
import {
  type RejectCapabilityDto,
  rejectCapabilitySchema,
} from '../dto/reject-capability.dto';
import {
  type RollbackCapabilityDto,
  rollbackCapabilitySchema,
} from '../dto/rollback-capability.dto';
import { CapabilityDualWriteMetricsService } from '../services/capability-dual-write-metrics.service';
import { CapabilityService } from '../services/capability.service';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { CapabilityInvocation } from '../../../generated/prisma';
import type { CapabilityDualWriteStatus } from '../types/capability-dual-write.types';
import type { BulkApproveResult } from '../types/capability-stream.types';
import type {
  CapabilityProposalResult,
  PaginatedCapabilities,
} from '../types/capability.types';

/**
 * Stream 10 — user-facing capability endpoints. 3-line methods only:
 * extract, call ONE service method, return.
 */
@Controller('agent/capabilities')
export class CapabilityController {
  constructor(
    private readonly service: CapabilityService,
    private readonly dualWriteMetrics: CapabilityDualWriteMetricsService,
  ) {}

  @Get('dual-write-status')
  dualWriteStatus(): CapabilityDualWriteStatus {
    return this.dualWriteMetrics.status();
  }

  // V2 Stream 08 — bulk approval. Declared BEFORE @Post(':id/approve')
  // because "bulk-approve" is a literal path; without explicit ordering
  // NestJS would treat it as an id param value. Cap is 100 per request
  // (enforced in DTO).
  @Post('bulk-approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(bulkApproveCapabilitySchema)) dto: BulkApproveCapabilityDto,
  ): Promise<BulkApproveResult> {
    return this.service.bulkApprove(user.id, dto.invocationIds);
  }

  @Post()
  async propose(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(proposeCapabilitySchema)) dto: ProposeCapabilityDto,
  ): Promise<CapabilityProposalResult> {
    return this.service.propose(user.id, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listCapabilitiesQuerySchema)) query: ListCapabilitiesQueryDto,
  ): Promise<PaginatedCapabilities> {
    return this.service.list(user.id, query);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CapabilityInvocation> {
    return this.service.getById(user.id, id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CapabilityInvocation> {
    return this.service.approve(user.id, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectCapabilitySchema)) dto: RejectCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.service.reject(user.id, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelCapabilitySchema)) dto: CancelCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.service.cancel(user.id, id, dto);
  }

  @Post(':id/rollback')
  @HttpCode(HttpStatus.OK)
  async rollback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rollbackCapabilitySchema)) _dto: RollbackCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.service.rollback(user.id, id);
  }
}
