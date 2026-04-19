import { Injectable, Logger } from '@nestjs/common';
import { EntityNotFoundException } from '../../../common/errors/business.exception';
import { HardwareProfile } from '../../../common/enums/hardware-profile.enum';
import { HARDWARE_PROFILE_RANGES } from '../constants/hardware-profile.constants';
import { PACK_RECOMMENDED_LIMIT } from '../constants/discovery.constants';
import { RuntimeType } from '../../../generated/prisma';
import { ModelCatalogRepository } from '../repositories/model-catalog.repository';
import { OllamaService } from '../ollama.service';
import type {
  HardwarePackInfo,
  InstallPackInput,
  InstallPackResult,
} from '../types/discovery.types';

@Injectable()
export class HardwarePackService {
  private readonly logger = new Logger(HardwarePackService.name);

  constructor(
    private readonly catalogRepo: ModelCatalogRepository,
    private readonly ollamaService: OllamaService,
  ) {}

  async listPacks(): Promise<HardwarePackInfo[]> {
    const result: HardwarePackInfo[] = [];
    for (const range of HARDWARE_PROFILE_RANGES) {
      const entries = await this.catalogRepo.findByHardwareProfile(
        range.profile,
        RuntimeType.OLLAMA,
        PACK_RECOMMENDED_LIMIT,
      );
      result.push({
        profile: range.profile,
        label: range.label,
        description: `Models optimized for ${range.label}`,
        maxModelSizeBytes: range.maxBytes.toString(),
        recommendedModels: entries.map((e) => `${e.name}:${e.tag}`),
      });
    }
    return result;
  }

  async installPack(input: InstallPackInput): Promise<InstallPackResult> {
    const profile = this.validateProfile(input.profile);
    const entries = await this.catalogRepo.findByHardwareProfile(
      profile,
      RuntimeType.OLLAMA,
      PACK_RECOMMENDED_LIMIT,
    );
    if (entries.length === 0) {
      return { profile, queued: 0, alreadyInstalled: 0, pullJobIds: [] };
    }

    let queued = 0;
    let alreadyInstalled = 0;
    const pullJobIds: string[] = [];

    for (const entry of entries) {
      try {
        const result = await this.ollamaService.pullFromCatalog(entry.id);
        queued += 1;
        pullJobIds.push(result.pullJobId);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'unknown';
        if (message.includes('already installed') || message.includes('INSTALLED')) {
          alreadyInstalled += 1;
        } else {
          this.logger.warn(`pack install skipped ${entry.name}:${entry.tag}: ${message}`);
        }
      }
    }

    return { profile, queued, alreadyInstalled, pullJobIds };
  }

  private validateProfile(profile: string): string {
    const allowed = new Set<string>(Object.values(HardwareProfile));
    if (!allowed.has(profile)) {
      throw new EntityNotFoundException('HardwareProfile', profile);
    }
    return profile;
  }
}
