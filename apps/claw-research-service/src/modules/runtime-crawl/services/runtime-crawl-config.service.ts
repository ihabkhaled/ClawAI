import { Injectable } from '@nestjs/common';

import { RUNTIME_CRAWL_DEFAULTS } from '../constants/runtime-crawl.constants';
import { RuntimeCrawlConfigRepository } from '../repositories/runtime-crawl-config.repository';
import type { RuntimeCrawlConfig } from '../../../generated/prisma';
import type { UpdateRuntimeCrawlConfigDto } from '../dto/update-runtime-crawl-config.dto';

@Injectable()
export class RuntimeCrawlConfigService {
  constructor(private readonly configs: RuntimeCrawlConfigRepository) {}

  /** The seeder makes this row at boot; creating it here heals a row deleted by hand. */
  async get(): Promise<RuntimeCrawlConfig> {
    const existing = await this.configs.find();
    return existing ?? this.configs.create({ ...RUNTIME_CRAWL_DEFAULTS });
  }

  async update(dto: UpdateRuntimeCrawlConfigDto, adminId: string): Promise<RuntimeCrawlConfig> {
    await this.get();
    return this.configs.update({ ...dto, updatedBy: adminId });
  }
}
