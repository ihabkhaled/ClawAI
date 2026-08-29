import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type SystemSetting } from '../../../generated/prisma';

/**
 * The first read path `SystemSetting` has ever had.
 *
 * The model has existed since the plans flagship with zero consumers, which is
 * why the PAYG kill switch had no home. Pure data access: whether a missing row
 * means "off" or "on" is a policy decision and belongs in the service.
 */
@Injectable()
export class SystemSettingRepository {
  private readonly logger = new Logger(SystemSettingRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string): Promise<SystemSetting | null> {
    this.logger.debug(`findByKey: key=${key}`);
    return this.prisma.systemSetting.findUnique({ where: { key } });
  }

  async listAll(): Promise<SystemSetting[]> {
    this.logger.debug('listAll: reading every setting');
    return this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async upsert(key: string, value: string): Promise<SystemSetting> {
    this.logger.debug(`upsert: key=${key}`);
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
