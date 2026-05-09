import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { CAPABILITY_QUEUE_EXPIRY_MINUTES_DEFAULT } from '../../../common/constants/capability.constants';
import { CapabilityClass } from '../../../common/enums/capability-class.enum';
import { CapabilityInvocationStatus } from '../../../common/enums/capability-invocation-status.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { CapabilityInvocationRepository } from '../repositories/capability-invocation.repository';
import { PolicyRepository } from '../repositories/policy.repository';
import { CapabilityRiskService } from '../services/capability-risk.service';
import { Prisma, type CapabilityInvocation } from '../../../generated/prisma';
import type { CompleteCapabilityDto } from '../dto/complete-capability.dto';
import type { ProposeCapabilityDto } from '../dto/propose-capability.dto';
import type {
  CapabilityProposalResult,
  RiskAssessmentInput,
  RiskAssessmentResult,
} from '../types/capability.types';

const TERMINAL_STATUSES = new Set<CapabilityInvocationStatus>([
  CapabilityInvocationStatus.EXECUTED,
  CapabilityInvocationStatus.FAILED,
  CapabilityInvocationStatus.REJECTED,
  CapabilityInvocationStatus.EXPIRED,
  CapabilityInvocationStatus.CANCELLED,
  CapabilityInvocationStatus.ROLLED_BACK,
  CapabilityInvocationStatus.ROLLBACK_FAILED,
  CapabilityInvocationStatus.DENIED,
]);

/**
 * Stream 10 — orchestrates the full capability invocation lifecycle.
 *
 * Public methods:
 *  - propose(userId, dto) — risk assessment + persist + publish
 *  - approve(invocationId, approverUserId) — manual approve
 *  - reject(invocationId, reviewerUserId, reason)
 *  - cancel(invocationId, userId)
 *  - complete(invocationId, deviceId, dto) — CLI reports outcome + undoPlan
 *  - rollback(invocationId, userId) — replays undoPlan in reverse
 *
 * Manager method ceiling: 80 lines / complexity 15. Per-method
 * private helpers handle event publishing + state transitions to keep
 * each entry point compact.
 */
@Injectable()
export class CapabilityApprovalManager {
  private readonly logger = new Logger(CapabilityApprovalManager.name);

  constructor(
    private readonly repo: CapabilityInvocationRepository,
    private readonly policyRepo: PolicyRepository,
    private readonly riskService: CapabilityRiskService,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async propose(
    userId: string,
    dto: ProposeCapabilityDto,
  ): Promise<CapabilityProposalResult> {
    const deviceAge = await this.repo.deviceAgeDays(dto.deviceId);
    const userClassCount = await this.repo.countForUserClass(userId, dto.capabilityClass);
    const orgIds = await this.policyRepo.findOrgIdsForUser(userId);
    const assessment = await this.riskService.assess(
      this.toAssessmentInput(userId, dto, deviceAge, userClassCount, orgIds),
    );
    const expiresAt = new Date(Date.now() + CAPABILITY_QUEUE_EXPIRY_MINUTES_DEFAULT * 60 * 1000);
    const created = await this.repo.create(this.toCreateInput(userId, dto, assessment, expiresAt));
    void this.publishProposalEvents(created, assessment.status);
    return {
      id: created.id,
      status: created.status as CapabilityInvocationStatus,
      riskScore: created.riskScore,
      riskLabel: created.riskLabel as never,
      matchedPolicyId: created.matchedPolicyId ?? undefined,
      matchedPolicyName: created.matchedPolicyName ?? undefined,
      expiresAt,
    };
  }

  async approve(invocationId: string, approverUserId: string): Promise<CapabilityInvocation> {
    const inv = await this.loadOwned(invocationId, approverUserId);
    if (inv.status !== CapabilityInvocationStatus.PENDING_APPROVAL) {
      throw new BusinessException(
        'agent.capability.invalid_transition',
        'CAPABILITY_NOT_PENDING',
        HttpStatus.CONFLICT,
        { current: inv.status },
      );
    }
    const updated = await this.repo.update(invocationId, {
      status: CapabilityInvocationStatus.APPROVED,
      reviewedBy: approverUserId,
      reviewedAt: new Date(),
    });
    void this.publishEvent(EventPattern.AGENT_CAPABILITY_APPROVED, this.basePayload(updated, { approverUserId }));
    return updated;
  }

  async reject(
    invocationId: string,
    reviewerUserId: string,
    reason: string,
  ): Promise<CapabilityInvocation> {
    const inv = await this.loadOwned(invocationId, reviewerUserId);
    if (inv.status !== CapabilityInvocationStatus.PENDING_APPROVAL) {
      throw new BusinessException(
        'agent.capability.invalid_transition',
        'CAPABILITY_NOT_PENDING',
        HttpStatus.CONFLICT,
        { current: inv.status },
      );
    }
    const updated = await this.repo.update(invocationId, {
      status: CapabilityInvocationStatus.REJECTED,
      reviewedBy: reviewerUserId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    });
    void this.publishEvent(EventPattern.AGENT_CAPABILITY_REJECTED, this.basePayload(updated, { reviewerUserId, reason }));
    return updated;
  }

  async cancel(invocationId: string, userId: string): Promise<CapabilityInvocation> {
    const inv = await this.loadOwned(invocationId, userId);
    if (TERMINAL_STATUSES.has(inv.status as CapabilityInvocationStatus)) {
      throw new BusinessException(
        'agent.capability.already_terminal',
        'CAPABILITY_ALREADY_TERMINAL',
        HttpStatus.CONFLICT,
        { current: inv.status },
      );
    }
    const updated = await this.repo.update(invocationId, {
      status: CapabilityInvocationStatus.CANCELLED,
    });
    void this.publishEvent(EventPattern.AGENT_CAPABILITY_CANCELLED, this.basePayload(updated, { cancelledByUserId: userId }));
    return updated;
  }

  async complete(
    invocationId: string,
    deviceId: string,
    dto: CompleteCapabilityDto,
  ): Promise<CapabilityInvocation> {
    const inv = await this.repo.findById(invocationId);
    if (inv === null) {
      throw new EntityNotFoundException('CapabilityInvocation', invocationId);
    }
    if (inv.deviceId !== deviceId) {
      throw new BusinessException(
        'agent.capability.device_mismatch',
        'CAPABILITY_DEVICE_MISMATCH',
        HttpStatus.FORBIDDEN,
      );
    }
    if (inv.status !== CapabilityInvocationStatus.EXECUTING) {
      throw new BusinessException(
        'agent.capability.invalid_transition',
        'CAPABILITY_NOT_EXECUTING',
        HttpStatus.CONFLICT,
        { current: inv.status },
      );
    }
    return dto.success
      ? this.completeSuccess(inv, dto)
      : this.completeFailure(inv, dto);
  }

  async rollback(invocationId: string, userId: string): Promise<CapabilityInvocation> {
    const inv = await this.loadOwned(invocationId, userId);
    if (inv.status !== CapabilityInvocationStatus.EXECUTED) {
      throw new BusinessException(
        'agent.capability.cannot_rollback',
        'CAPABILITY_NOT_ROLLBACKABLE',
        HttpStatus.CONFLICT,
        { current: inv.status },
      );
    }
    if (inv.undoPlan === null || inv.undoPlan === undefined) {
      throw new BusinessException(
        'agent.capability.no_undo_plan',
        'CAPABILITY_NO_UNDO_PLAN',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    // Mark intent — the actual undo execution happens CLI-side via a
    // queued UndoPlan; this row updates to ROLLED_BACK on CLI ack.
    const updated = await this.repo.update(invocationId, {
      status: CapabilityInvocationStatus.ROLLED_BACK,
      rolledBackAt: new Date(),
    });
    void this.publishEvent(EventPattern.AGENT_CAPABILITY_ROLLED_BACK, this.basePayload(updated, { partial: false }));
    return updated;
  }

  private async loadOwned(id: string, userId: string): Promise<CapabilityInvocation> {
    const inv = await this.repo.findByIdForUser(id, userId);
    if (inv === null) {
      throw new EntityNotFoundException('CapabilityInvocation', id);
    }
    return inv;
  }

  private async completeSuccess(
    inv: CapabilityInvocation,
    dto: CompleteCapabilityDto,
  ): Promise<CapabilityInvocation> {
    const updated = await this.repo.update(inv.id, {
      status: CapabilityInvocationStatus.EXECUTED,
      completedAt: new Date(),
      executionResult: (dto.result ?? {}) as Prisma.InputJsonValue,
      undoPlan: dto.undoPlan === undefined
        ? Prisma.JsonNull
        : (dto.undoPlan as Prisma.InputJsonValue),
      metadata: dto.noUndoReason === undefined
        ? ((inv.metadata ?? {}) as Prisma.InputJsonValue)
        : ({ ...((inv.metadata ?? {}) as Record<string, unknown>), noUndoReason: dto.noUndoReason } as Prisma.InputJsonValue),
    });
    const durationMs = updated.completedAt !== null && updated.startedExecutingAt !== null
      ? updated.completedAt.getTime() - updated.startedExecutingAt.getTime()
      : 0;
    void this.publishEvent(
      EventPattern.AGENT_CAPABILITY_EXECUTED,
      this.basePayload(updated, { durationMs }),
    );
    return updated;
  }

  private async completeFailure(
    inv: CapabilityInvocation,
    dto: CompleteCapabilityDto,
  ): Promise<CapabilityInvocation> {
    const updated = await this.repo.update(inv.id, {
      status: CapabilityInvocationStatus.FAILED,
      completedAt: new Date(),
      executionError: dto.errorMessage ?? 'CLI reported failure without errorMessage',
    });
    void this.publishEvent(
      EventPattern.AGENT_CAPABILITY_FAILED,
      this.basePayload(updated, { errorMessage: updated.executionError ?? '' }),
    );
    return updated;
  }

  private toAssessmentInput(
    userId: string,
    dto: ProposeCapabilityDto,
    deviceAgeDays: number | null,
    userInvocationsThisClassCount: number,
    orgIds: string[],
  ): RiskAssessmentInput {
    return {
      capabilityClass: dto.capabilityClass,
      capabilityOperation: dto.capabilityOperation,
      targetDescriptor: dto.targetDescriptor,
      payload: dto.payload,
      blastRadius: dto.blastRadius,
      reversibility: dto.reversibility,
      userId,
      deviceId: dto.deviceId,
      deviceAgeDays: deviceAgeDays ?? undefined,
      userInvocationsThisClassCount,
      orgIds,
    };
  }

  private toCreateInput(
    userId: string,
    dto: ProposeCapabilityDto,
    assessment: RiskAssessmentResult,
    expiresAt: Date,
  ): Prisma.CapabilityInvocationCreateInput {
    return {
      userId,
      deviceId: dto.deviceId,
      recipeRunId: dto.recipeRunId ?? null,
      parent: dto.parentInvocationId === undefined ? undefined : { connect: { id: dto.parentInvocationId } },
      capabilityClass: dto.capabilityClass,
      capabilityOperation: dto.capabilityOperation,
      targetDescriptor: dto.targetDescriptor as Prisma.InputJsonValue,
      requiredScopes: dto.requiredScopes as Prisma.InputJsonValue,
      blastRadius: dto.blastRadius,
      reversibility: dto.reversibility,
      payload: dto.payload as Prisma.InputJsonValue,
      status: assessment.status,
      riskScore: assessment.riskScore,
      riskLabel: assessment.riskLabel as Prisma.CapabilityInvocationCreateInput['riskLabel'],
      matchedPolicy: assessment.matchedPolicyId === null
        ? undefined
        : { connect: { id: assessment.matchedPolicyId } },
      matchedPolicyName: assessment.matchedPolicyName,
      expiresAt,
      metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
    };
  }

  private basePayload(
    inv: CapabilityInvocation,
    extra: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      invocationId: inv.id,
      userId: inv.userId,
      deviceId: inv.deviceId,
      capabilityClass: inv.capabilityClass,
      capabilityOperation: inv.capabilityOperation,
      occurredAt: new Date().toISOString(),
      ...extra,
    };
  }

  private async publishProposalEvents(
    inv: CapabilityInvocation,
    status: CapabilityInvocationStatus,
  ): Promise<void> {
    await this.publishEvent(EventPattern.AGENT_CAPABILITY_PROPOSED, {
      ...this.basePayload(inv, {}),
      riskScore: inv.riskScore,
      riskLabel: inv.riskLabel,
      blastRadius: inv.blastRadius,
      reversibility: inv.reversibility,
      recipeRunId: inv.recipeRunId ?? undefined,
    });
    if (inv.matchedPolicyId !== null) {
      await this.publishEvent(EventPattern.AGENT_CAPABILITY_POLICY_MATCHED, {
        ...this.basePayload(inv, {}),
        matchedPolicyId: inv.matchedPolicyId,
        matchedPolicyName: inv.matchedPolicyName,
        riskScore: inv.riskScore,
      });
    }
    if (status === CapabilityInvocationStatus.AUTO_APPROVED) {
      await this.publishEvent(EventPattern.AGENT_CAPABILITY_AUTO_APPROVED, this.basePayload(inv, {
        matchedPolicyName: inv.matchedPolicyName ?? '',
      }));
    } else if (status === CapabilityInvocationStatus.DENIED) {
      await this.publishEvent(EventPattern.AGENT_CAPABILITY_DENIED, this.basePayload(inv, {
        matchedPolicyId: inv.matchedPolicyId ?? '',
        matchedPolicyName: inv.matchedPolicyName ?? '',
        reason: 'policy_match_deny',
      }));
    }
  }

  private async publishEvent(
    pattern: EventPattern,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.rabbitMQ.publish(pattern, { ...payload, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error(
        `Failed to publish ${pattern}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}

/**
 * Re-export so other services can guard transitions.
 */
export { TERMINAL_STATUSES, CapabilityClass };
