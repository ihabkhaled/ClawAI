import { Injectable, Logger } from '@nestjs/common';
import { type MemoryPreference } from '../../../generated/prisma';
import { DEFAULT_MEMORY_PREFERENCE } from '../constants/memory-preference.constants';
import { MemoryPreferenceRepository } from '../repositories/memory-preference.repository';
import type { MemoryPreferencePatch } from '../types/memory-preference.types';

@Injectable()
export class MemoryPreferenceService {
  private readonly logger = new Logger(MemoryPreferenceService.name);

  constructor(private readonly repo: MemoryPreferenceRepository) {}

  async get(userId: string): Promise<MemoryPreference> {
    this.logger.debug(`get: userId=${userId}`);
    const existing = await this.repo.findByUserId(userId);
    if (existing) {
      return existing;
    }
    return {
      userId,
      ...DEFAULT_MEMORY_PREFERENCE,
      updatedAt: new Date(),
    };
  }

  async upsert(userId: string, patch: MemoryPreferencePatch): Promise<MemoryPreference> {
    this.logger.log(`upsert: userId=${userId} keys=${Object.keys(patch).join(',')}`);
    return this.repo.upsert(userId, patch);
  }
}
