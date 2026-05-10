import { Injectable } from '@nestjs/common';
import { type PaginatedResult } from '../../../common/types';
import { EntityNotFoundException } from '../../../common/errors';
import { TaxonomyRoleRepository } from '../repositories/taxonomy-role.repository';
import { type ListRolesQueryDto } from '../dto/list-roles-query.dto';
import { type CreateRoleDto } from '../dto/create-role.dto';
import { type TaxonomyRoleRecord } from '../types/taxonomy.types';

@Injectable()
export class TaxonomyService {
  constructor(private readonly repo: TaxonomyRoleRepository) {}

  async listRoles(query: ListRolesQueryDto): Promise<PaginatedResult<TaxonomyRoleRecord>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const { items, total } = await this.repo.list({
      industry: query.industry,
      domain: query.domain,
      search: query.search,
      skip,
      take: limit,
    });
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRole(id: string): Promise<TaxonomyRoleRecord> {
    const role = await this.repo.findById(id);
    if (role === null) throw new EntityNotFoundException('TaxonomyRole', id);
    return role;
  }

  async createRole(dto: CreateRoleDto): Promise<TaxonomyRoleRecord> {
    return this.repo.create({
      roleKey: dto.roleKey,
      displayName: dto.displayName,
      industryKey: dto.industryKey,
      domainKey: dto.domainKey,
      capabilities: dto.capabilities,
      privacyDefault: dto.privacyDefault,
    });
  }
}
