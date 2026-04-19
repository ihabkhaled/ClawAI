import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessException,
  DuplicateEntityException,
  EntityNotFoundException,
} from '../../../common/errors/business.exception';
import { DiscoverySourceRepository } from '../repositories/discovery-source.repository';
import type { CreateSourceInput, UpdateSourceInput } from '../types/discovery.types';
import type { DiscoverySource } from '../../../generated/prisma';

@Injectable()
export class DiscoverySourceService {
  constructor(private readonly sourceRepo: DiscoverySourceRepository) {}

  async list(): Promise<DiscoverySource[]> {
    return this.sourceRepo.findAll();
  }

  async getById(id: string): Promise<DiscoverySource> {
    const source = await this.sourceRepo.findById(id);
    if (source === null) {
      throw new EntityNotFoundException('DiscoverySource', id);
    }
    return source;
  }

  async create(input: CreateSourceInput): Promise<DiscoverySource> {
    await this.ensureNameAvailable(input.name);
    return this.sourceRepo.create({
      name: input.name.trim(),
      type: input.type,
      baseUrl: input.baseUrl.trim(),
      isEnabled: input.isEnabled,
      categories: input.categories,
      maxResults: input.maxResults,
      minQuality: input.minQuality,
    });
  }

  async update(id: string, input: UpdateSourceInput): Promise<DiscoverySource> {
    await this.getById(id);
    if (input.name !== undefined) {
      const existing = await this.sourceRepo.findByName(input.name);
      if (existing !== null && existing.id !== id) {
        throw new DuplicateEntityException('DiscoverySource', 'name');
      }
    }
    return this.sourceRepo.update(id, {
      name: input.name?.trim(),
      type: input.type,
      baseUrl: input.baseUrl?.trim(),
      isEnabled: input.isEnabled,
      categories: input.categories,
      maxResults: input.maxResults,
      minQuality: input.minQuality,
    });
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.sourceRepo.delete(id);
  }

  async ensureDefaultSourcesExist(
    defaults: Array<{ name: string; type: string; baseUrl: string }>,
  ): Promise<number> {
    let created = 0;
    for (const d of defaults) {
      const existing = await this.sourceRepo.findByName(d.name);
      if (existing !== null) continue;
      await this.sourceRepo.create({
        name: d.name,
        type: d.type as CreateSourceInput['type'],
        baseUrl: d.baseUrl,
        isEnabled: true,
        categories: [],
        maxResults: 50,
        minQuality: 0,
      });
      created += 1;
    }
    return created;
  }

  private async ensureNameAvailable(name: string): Promise<void> {
    const existing = await this.sourceRepo.findByName(name.trim());
    if (existing !== null) {
      throw new BusinessException(
        `Discovery source with name "${name}" already exists`,
        'DUPLICATE_SOURCE_NAME',
        HttpStatus.CONFLICT,
      );
    }
  }
}
