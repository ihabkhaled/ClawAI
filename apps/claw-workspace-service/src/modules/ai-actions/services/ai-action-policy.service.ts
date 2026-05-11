import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventPattern } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { AiActionPolicyRepository } from '../repositories/ai-action-policy.repository';
import type {
  CreateAiActionPolicyDto,
  UpdateAiActionPolicyDto,
} from '../dto/ai-action-policy.dto';
import type { AiActionPolicy } from '../../../generated/prisma';

@Injectable()
export class AiActionPolicyService {
  private readonly logger = new Logger(AiActionPolicyService.name);

  constructor(
    private readonly repo: AiActionPolicyRepository,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async list(): Promise<AiActionPolicy[]> {
    return this.repo.listAll();
  }

  async getById(id: string): Promise<AiActionPolicy> {
    const found = await this.repo.findById(id);
    if (found === null) throw new NotFoundException({ messageKey: 'POLICY_NOT_FOUND' });
    return found;
  }

  async create(dto: CreateAiActionPolicyDto, createdBy: string): Promise<AiActionPolicy> {
    const existing = await this.repo.findByName(dto.name);
    if (existing !== null) {
      throw new ConflictException({ messageKey: 'POLICY_NAME_TAKEN' });
    }
    const policy = await this.repo.create({
      name: dto.name,
      kind: dto.kind,
      description: dto.description ?? null,
      providerRegex: dto.providerRegex,
      actionKindRegex: dto.actionKindRegex,
      riskMaxLabel: dto.riskMaxLabel,
      riskMaxScore: dto.riskMaxScore,
      priority: dto.priority,
      requireReason: dto.requireReason,
      isActive: dto.isActive,
      isSystemDefault: false,
      createdBy,
    });
    await this.publishPolicyEvent(EventPattern.AI_ACTION_POLICY_CREATED, policy, createdBy, null);
    return policy;
  }

  async update(
    id: string,
    dto: UpdateAiActionPolicyDto,
    actorUserId: string,
  ): Promise<AiActionPolicy> {
    const before = await this.getById(id);
    const updated = await this.repo.update(id, {
      ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.providerRegex !== undefined ? { providerRegex: dto.providerRegex } : {}),
      ...(dto.actionKindRegex !== undefined ? { actionKindRegex: dto.actionKindRegex } : {}),
      ...(dto.riskMaxLabel !== undefined ? { riskMaxLabel: dto.riskMaxLabel } : {}),
      ...(dto.riskMaxScore !== undefined ? { riskMaxScore: dto.riskMaxScore } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.requireReason !== undefined ? { requireReason: dto.requireReason } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    await this.publishPolicyEvent(
      EventPattern.AI_ACTION_POLICY_UPDATED,
      updated,
      actorUserId,
      before,
    );
    return updated;
  }

  async deleteById(id: string, actorUserId: string): Promise<void> {
    const policy = await this.getById(id);
    if (policy.isSystemDefault) {
      throw new ConflictException({ messageKey: 'POLICY_SYSTEM_DEFAULT_PROTECTED' });
    }
    await this.repo.deleteById(id);
    await this.publishPolicyEvent(EventPattern.AI_ACTION_POLICY_DELETED, policy, actorUserId, null);
  }

  // Audit trail. Audit-service consumes the 3 patterns and writes to MongoDB.
  // Fire-and-forget so a broker outage doesn't break admin operations.
  private async publishPolicyEvent(
    pattern: EventPattern,
    policy: AiActionPolicy,
    actorUserId: string,
    before: AiActionPolicy | null,
  ): Promise<void> {
    try {
      await this.rabbitmq.publish(pattern, {
        policyId: policy.id,
        policyName: policy.name,
        kind: policy.kind,
        priority: policy.priority,
        isActive: policy.isActive,
        isSystemDefault: policy.isSystemDefault,
        actorUserId,
        before,
        after: policy,
        at: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`policy audit event publish failed [${pattern}]: ${message}`);
    }
  }
}
