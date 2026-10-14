import { Injectable } from '@nestjs/common';

import { toJsonValue } from '../../../common/utilities/to-json-value.utility';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { isPlainRecord } from '../../../common/utilities/is-plain-record.utility';
import { type AuditRecord, type AuditWrite } from '../types/curation.types';

@Injectable()
export class AdminAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async write(row: AuditWrite): Promise<void> {
    await this.prisma.pluginAdminAudit.create({
      data: {
        actorId: row.actorId,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        summary: toJsonValue(row.summary),
      },
    });
  }

  async findRecent(limit: number, targetType: string | undefined): Promise<AuditRecord[]> {
    const rows = await this.prisma.pluginAdminAudit.findMany({
      where: targetType === undefined ? {} : { targetType },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      summary: isPlainRecord(row.summary) ? row.summary : {},
      createdAt: row.createdAt,
    }));
  }
}
