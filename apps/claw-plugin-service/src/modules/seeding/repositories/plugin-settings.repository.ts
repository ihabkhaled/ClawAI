import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type PluginSettingDefault } from '../types/seeding.types';

@Injectable()
export class PluginSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Inserts the keys that do not exist yet; existing values are never touched. */
  async insertMissing(defaults: readonly PluginSettingDefault[]): Promise<number> {
    const result = await this.prisma.pluginSetting.createMany({
      data: defaults.map((setting) => ({ key: setting.key, value: setting.value })),
      skipDuplicates: true,
    });
    return result.count;
  }
}
