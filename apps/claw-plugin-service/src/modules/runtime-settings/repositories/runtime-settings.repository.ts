import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type RuntimeSettingRow } from '../types/runtime-settings.types';

@Injectable()
export class RuntimeSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByKeys(keys: readonly string[]): Promise<RuntimeSettingRow[]> {
    return this.prisma.pluginSetting.findMany({
      where: { key: { in: [...keys] } },
      select: { key: true, value: true },
    });
  }
}
