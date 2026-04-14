import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AgentRepoRepository } from '../repositories/agent-repo.repository';
import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import type { RegisterRepoDto } from '../dto/register-repo.dto';
import type { UpdateRepoDto } from '../dto/update-repo.dto';
import type { ListReposQueryDto } from '../dto/list-repos-query.dto';
import type { PaginatedRepos } from '../types/agent.types';
import type { LocalRepo } from '../../../generated/prisma';

@Injectable()
export class AgentRepoService {
  private readonly logger = new Logger(AgentRepoService.name);

  constructor(
    private readonly repoRepository: AgentRepoRepository,
    private readonly sessionRepository: AgentSessionRepository,
  ) {}

  async register(userId: string, dto: RegisterRepoDto): Promise<LocalRepo> {
    const session = await this.sessionRepository.findById(dto.sessionId);
    if (session === null) throw new EntityNotFoundException('AgentSession', dto.sessionId);
    if (session.userId !== userId) {
      throw new BusinessException('agent.session.forbidden', 'FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    const repo = await this.repoRepository.create({
      session: { connect: { id: dto.sessionId } },
      userId,
      repoPath: dto.repoPath,
      name: dto.name,
      branch: dto.branch,
      commitHash: dto.commitHash,
      isDirty: dto.isDirty,
      fileCount: dto.fileCount,
    });
    this.logger.log(`Repo registered: ${repo.id} (${dto.name})`);
    return repo;
  }

  async getRepos(userId: string, query: ListReposQueryDto): Promise<PaginatedRepos> {
    return this.repoRepository.findAllByUser(userId, query);
  }

  async getRepo(id: string, userId: string): Promise<LocalRepo> {
    return this.getRepoRaw(id, userId);
  }

  async update(id: string, userId: string, dto: UpdateRepoDto): Promise<LocalRepo> {
    await this.getRepoRaw(id, userId);
    return this.repoRepository.update(id, {
      ...(dto.branch !== undefined ? { branch: dto.branch } : {}),
      ...(dto.commitHash !== undefined ? { commitHash: dto.commitHash } : {}),
      ...(dto.isDirty !== undefined ? { isDirty: dto.isDirty } : {}),
      ...(dto.fileCount !== undefined ? { fileCount: dto.fileCount } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      lastScannedAt: new Date(),
    });
  }

  async unregister(id: string, userId: string): Promise<LocalRepo> {
    const repo = await this.getRepoRaw(id, userId);
    await this.repoRepository.delete(id);
    return repo;
  }

  private async getRepoRaw(id: string, userId: string): Promise<LocalRepo> {
    const repo = await this.repoRepository.findById(id);
    if (repo === null) throw new EntityNotFoundException('LocalRepo', id);
    if (repo.userId !== userId) {
      throw new BusinessException('agent.repo.forbidden', 'FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    return repo;
  }
}
