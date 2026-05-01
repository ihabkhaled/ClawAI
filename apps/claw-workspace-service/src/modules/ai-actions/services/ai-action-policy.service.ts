import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AiActionPolicyRepository } from '../repositories/ai-action-policy.repository';
import type {
  CreateAiActionPolicyDto,
  UpdateAiActionPolicyDto,
} from '../dto/ai-action-policy.dto';
import type { AiActionPolicy } from '../../../generated/prisma';

@Injectable()
export class AiActionPolicyService {
  constructor(private readonly repo: AiActionPolicyRepository) {}

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
    return this.repo.create({
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
  }

  async update(id: string, dto: UpdateAiActionPolicyDto): Promise<AiActionPolicy> {
    await this.getById(id);
    return this.repo.update(id, {
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
  }

  async deleteById(id: string): Promise<void> {
    const policy = await this.getById(id);
    if (policy.isSystemDefault) {
      throw new ConflictException({ messageKey: 'POLICY_SYSTEM_DEFAULT_PROTECTED' });
    }
    await this.repo.deleteById(id);
  }
}
