import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { ChainRepository } from '../repositories/chain.repository';
import type { CreateChainDto, UpdateChainDto } from '../dto/chain.dto';
import type { Prisma, WorkspaceChain } from '../../../generated/prisma';

// v3 round 12 (2026-05-14) — Prompt 11: cross-workspace chain CRUD.
// Mirrors the email-signature/template service shape: ownership-scoped,
// unique-name guarded, version bumped only when the DSL actually
// changes (so toggling isEnabled doesn't churn the version).
@Injectable()
export class ChainService {
  private readonly logger = new Logger(ChainService.name);

  constructor(private readonly repo: ChainRepository) {}

  async list(userId: string): Promise<WorkspaceChain[]> {
    this.logger.debug(`list: userId=${userId}`);
    return this.repo.listForUser(userId);
  }

  async getOwn(userId: string, id: string): Promise<WorkspaceChain> {
    const chain = await this.repo.findById(id);
    if (chain === null || chain.userId !== userId) {
      throw new NotFoundException({ messageKey: 'CHAIN_NOT_FOUND' });
    }
    return chain;
  }

  async create(userId: string, dto: CreateChainDto): Promise<WorkspaceChain> {
    const existing = await this.repo.findByName(userId, dto.name);
    if (existing !== null) {
      throw new ConflictException({ messageKey: 'CHAIN_NAME_TAKEN' });
    }
    return this.repo.create({
      userId,
      name: dto.name,
      description: dto.description ?? null,
      dsl: dto.dsl as unknown as Prisma.InputJsonValue,
      isEnabled: dto.isEnabled ?? true,
      version: 1,
    });
  }

  async update(userId: string, id: string, dto: UpdateChainDto): Promise<WorkspaceChain> {
    const existing = await this.getOwn(userId, id);
    if (dto.name !== undefined && dto.name !== existing.name) {
      const clash = await this.repo.findByName(userId, dto.name);
      if (clash !== null && clash.id !== id) {
        throw new ConflictException({ messageKey: 'CHAIN_NAME_TAKEN' });
      }
    }
    // Bump version only on a real DSL change — toggling isEnabled or
    // renaming is not a behavioural change.
    const dslChanged =
      dto.dsl !== undefined && JSON.stringify(dto.dsl) !== JSON.stringify(existing.dsl);
    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.dsl !== undefined ? { dsl: dto.dsl as unknown as Prisma.InputJsonValue } : {}),
      ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
      ...(dslChanged ? { version: { increment: 1 } } : {}),
    });
  }

  async deleteById(userId: string, id: string): Promise<void> {
    await this.getOwn(userId, id);
    await this.repo.deleteById(id);
  }
}
