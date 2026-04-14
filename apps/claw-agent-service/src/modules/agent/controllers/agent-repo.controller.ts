import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { AgentRepoService } from '../services/agent-repo.service';
import { type RegisterRepoDto, registerRepoSchema } from '../dto/register-repo.dto';
import { type UpdateRepoDto, updateRepoSchema } from '../dto/update-repo.dto';
import { type ListReposQueryDto, listReposQuerySchema } from '../dto/list-repos-query.dto';
import type { PaginatedRepos } from '../types/agent.types';
import type { LocalRepo } from '../../../generated/prisma';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('agent/repos')
export class AgentRepoController {
  constructor(private readonly service: AgentRepoService) {}

  @Post()
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(registerRepoSchema)) dto: RegisterRepoDto,
  ): Promise<LocalRepo> {
    return this.service.register(user.id, dto);
  }

  @Get()
  async listRepos(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listReposQuerySchema)) query: ListReposQueryDto,
  ): Promise<PaginatedRepos> {
    return this.service.getRepos(user.id, query);
  }

  @Get(':id')
  async getRepo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<LocalRepo> {
    return this.service.getRepo(id, user.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRepoSchema)) dto: UpdateRepoDto,
  ): Promise<LocalRepo> {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  async unregister(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<LocalRepo> {
    return this.service.unregister(id, user.id);
  }
}
