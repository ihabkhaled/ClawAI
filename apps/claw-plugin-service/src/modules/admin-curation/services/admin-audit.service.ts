import { Injectable, Logger } from '@nestjs/common';
import { type AdminAuditRowView } from '@claw/shared-types';

import {
  type AdminAuditAction,
  type AdminAuditTarget,
} from '../../../common/enums/admin-audit-action.enum';
import { AdminAuditRepository } from '../repositories/admin-audit.repository';
import { type AuditQuery } from '../dto/curation.dto';

/**
 * One row per admin change in plugin_admin_audit. The summary holds names, counts and codes only:
 * never a credential, a URL query string or a tool argument. A failed audit write is logged loudly
 * but does not undo the change that already happened.
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly repository: AdminAuditRepository) {}

  async record(
    actorId: string,
    action: AdminAuditAction,
    targetType: AdminAuditTarget,
    targetId: string,
    summary: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.repository.write({ actorId, action, targetType, targetId, summary });
    } catch {
      this.logger.error(
        `record: audit row ${action} for ${targetType} ${targetId} was not written`,
      );
    }
  }

  async list(query: AuditQuery): Promise<AdminAuditRowView[]> {
    const rows = await this.repository.findRecent(query.limit, query.targetType);
    return rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
