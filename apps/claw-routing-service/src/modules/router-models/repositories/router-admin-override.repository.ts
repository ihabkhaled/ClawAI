import { Injectable, Logger } from '@nestjs/common';
import { type Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type RouterAdminOverrideRecord } from '../types/router-model-registry.types';
import { mapPrismaOverrideToRecord } from '../utilities/router-admin-override-record.utility';

@Injectable()
export class RouterAdminOverrideRepository {
  private readonly logger = new Logger(RouterAdminOverrideRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async listByProfileId(
    profileId: string,
    onlyActive = true,
  ): Promise<RouterAdminOverrideRecord[]> {
    this.logger.debug(`listByProfileId profileId=${profileId} onlyActive=${onlyActive}`);
    const where: Prisma.RouterAdminOverrideWhereInput = { profileId };
    if (onlyActive) where.isActive = true;
    const rows = await this.prisma.routerAdminOverride.findMany({
      where,
      orderBy: { setAt: 'desc' },
    });
    return rows.map(mapPrismaOverrideToRecord);
  }

  async upsertOverride(input: {
    profileId: string;
    fieldName: string;
    fieldValue: unknown;
    reason?: string;
    setBy: string;
  }): Promise<RouterAdminOverrideRecord> {
    this.logger.log(
      `upsertOverride profileId=${input.profileId} fieldName=${input.fieldName} setBy=${input.setBy}`,
    );
    const row = await this.prisma.routerAdminOverride.upsert({
      where: {
        profileId_fieldName: { profileId: input.profileId, fieldName: input.fieldName },
      },
      create: {
        profileId: input.profileId,
        fieldName: input.fieldName,
        fieldValue: input.fieldValue as Prisma.InputJsonValue,
        reason: input.reason ?? null,
        setBy: input.setBy,
        isActive: true,
      },
      update: {
        fieldValue: input.fieldValue as Prisma.InputJsonValue,
        reason: input.reason ?? null,
        setBy: input.setBy,
        isActive: true,
        setAt: new Date(),
      },
    });
    return mapPrismaOverrideToRecord(row);
  }

  async deactivate(profileId: string, fieldName: string): Promise<void> {
    this.logger.log(`deactivate profileId=${profileId} fieldName=${fieldName}`);
    await this.prisma.routerAdminOverride.updateMany({
      where: { profileId, fieldName },
      data: { isActive: false },
    });
  }
}
