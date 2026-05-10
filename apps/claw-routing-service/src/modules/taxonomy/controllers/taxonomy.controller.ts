import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { type PaginatedResult } from '../../../common/types';
import { TaxonomyService } from '../services/taxonomy.service';
import { type ListRolesQueryDto, listRolesQuerySchema } from '../dto/list-roles-query.dto';
import { type CreateRoleDto, createRoleSchema } from '../dto/create-role.dto';
import { type TaxonomyRoleRecord } from '../types/taxonomy.types';
import { DomainTag } from '../../../generated/prisma';

@Controller('routing/taxonomy')
export class TaxonomyController {
  constructor(private readonly service: TaxonomyService) {}

  @Get('roles')
  async listRoles(
    @Query(new ZodValidationPipe(listRolesQuerySchema)) query: ListRolesQueryDto,
  ): Promise<PaginatedResult<TaxonomyRoleRecord>> {
    return this.service.listRoles(query);
  }

  @Get('roles/:id')
  async getRole(@Param('id') id: string): Promise<TaxonomyRoleRecord> {
    return this.service.getRole(id);
  }

  @Post('roles')
  @Roles(UserRole.ADMIN)
  async createRole(
    @Body(new ZodValidationPipe(createRoleSchema)) dto: CreateRoleDto,
  ): Promise<TaxonomyRoleRecord> {
    return this.service.createRole(dto);
  }

  @Get('domains')
  listDomains(): { domains: string[] } {
    return { domains: Object.values(DomainTag) };
  }
}
