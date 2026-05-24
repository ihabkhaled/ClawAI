import { Injectable, Logger } from '@nestjs/common';

import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { CapabilityApprovalManager } from '../managers/capability-approval.manager';
import { CapabilityInvocationRepository } from '../repositories/capability-invocation.repository';
import type { CancelCapabilityDto } from '../dto/cancel-capability.dto';
import type { CompleteCapabilityDto } from '../dto/complete-capability.dto';
import type { ListCapabilitiesQueryDto } from '../dto/list-capabilities-query.dto';
import type { ProposeCapabilityDto } from '../dto/propose-capability.dto';
import type { RejectCapabilityDto } from '../dto/reject-capability.dto';
import type { BulkApproveResult } from '../types/capability-stream.types';
import type { CapabilityInvocation } from '../../../generated/prisma';
import type {
  CapabilityProposalResult,
  PaginatedCapabilities,
} from '../types/capability.types';

/**
 * Stream 10 — orchestration glue. Service methods are ≤30 lines and
 * delegate to the manager + repository per agent-service rules.
 */
@Injectable()
export class CapabilityService {
  private readonly logger = new Logger(CapabilityService.name);

  constructor(
    private readonly repo: CapabilityInvocationRepository,
    private readonly manager: CapabilityApprovalManager,
  ) {}

  async propose(userId: string, dto: ProposeCapabilityDto): Promise<CapabilityProposalResult> {
    return this.manager.propose(userId, dto);
  }

  async list(userId: string, query: ListCapabilitiesQueryDto): Promise<PaginatedCapabilities> {
    return this.repo.list(query, userId);
  }

  async getById(userId: string, id: string): Promise<CapabilityInvocation> {
    const inv = await this.repo.findByIdForUser(id, userId);
    if (inv === null) {
      throw new EntityNotFoundException('CapabilityInvocation', id);
    }
    return inv;
  }

  async approve(userId: string, id: string): Promise<CapabilityInvocation> {
    return this.manager.approve(id, userId);
  }

  async reject(
    userId: string,
    id: string,
    dto: RejectCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.manager.reject(id, userId, dto.reason);
  }

  async cancel(
    userId: string,
    id: string,
    _dto: CancelCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.manager.cancel(id, userId);
  }

  async rollback(userId: string, id: string): Promise<CapabilityInvocation> {
    return this.manager.rollback(id, userId);
  }

  async getPendingForDevice(deviceId: string): Promise<CapabilityInvocation[]> {
    return this.repo.findActiveForDevice(deviceId);
  }

  async startExecutionByCli(id: string, deviceId: string): Promise<CapabilityInvocation | null> {
    return this.repo.tryStartExecution(id, deviceId);
  }

  async completeByCli(
    id: string,
    deviceId: string,
    dto: CompleteCapabilityDto,
  ): Promise<CapabilityInvocation> {
    return this.manager.complete(id, deviceId, dto);
  }

  // V2 Stream 08 — bulk approval. Each id is approved independently;
  // partial success is reported. The frontend wires this from a
  // checkbox-driven multi-select on the capability queue page.
  async bulkApprove(userId: string, invocationIds: string[]): Promise<BulkApproveResult> {
    this.logger.debug(`bulkApprove: userId=${userId} count=${String(invocationIds.length)}`);
    const approved: string[] = [];
    const failed: BulkApproveResult['failed'] = [];
    for (const id of invocationIds) {
      try {
        await this.manager.approve(id, userId);
        approved.push(id);
      } catch (err) {
        failed.push({
          id,
          reason: err instanceof Error ? err.message : 'unknown',
        });
      }
    }
    this.logger.info(
      `bulkApprove: ok=${String(approved.length)} failed=${String(failed.length)}`,
    );
    return { approved, failed };
  }
}
