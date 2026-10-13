import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { toJsonValue } from '../../../common/utilities/to-json-value.utility';
import { type PluginSettingRow } from '../types/admin.types';

@Injectable()
export class AdminSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PluginSettingRow[]> {
    return this.prisma.pluginSetting.findMany({
      select: { key: true, value: true, updatedAt: true },
    });
  }

  /** Writes every value or none: the admin sees one consistent change. */
  async upsertMany(values: Record<string, boolean | number>, updatedBy: string): Promise<void> {
    await this.prisma.$transaction(
      Object.entries(values).map(([key, value]) =>
        this.prisma.pluginSetting.upsert({
          where: { key },
          create: { key, value: toJsonValue(value), updatedBy },
          update: { value: toJsonValue(value), updatedBy },
        }),
      ),
    );
  }
}
