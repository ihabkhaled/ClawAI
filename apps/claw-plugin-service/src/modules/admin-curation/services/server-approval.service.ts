import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type AdminServerView } from '@claw/shared-types';

import { AdminAuditAction, AdminAuditTarget } from '../../../common/enums/admin-audit-action.enum';
import { CurationErrorCode } from '../../../common/enums/curation-error-code.enum';
import { ServerState } from '../../../common/enums/server-status.enum';
import { HostRulePolicyManager } from '../../host-rules/managers/host-rule-policy.manager';
import { REJECTABLE_FROM } from '../constants/curation.constants';
import { AdminServerPresenterManager } from '../managers/admin-server-presenter.manager';
import { SubmitterNoticeManager } from '../managers/submitter-notice.manager';
import { PendingServersRepository } from '../repositories/pending-servers.repository';
import { type PendingServerRecord } from '../types/curation.types';
import { AdminAuditService } from './admin-audit.service';

/**
 * The admin queue for users' own MCP servers (the `requireApproval` setting). Approve and reject are
 * single conditional updates, so two admins cannot both decide, and a server that moved on (the user
 * deleted it, or it was already decided) answers 409 instead of being overwritten. The submitter is
 * told through the notification pipeline; the notice never undoes the decision if it fails.
 */
@Injectable()
export class ServerApprovalService {
  private readonly logger = new Logger(ServerApprovalService.name);

  constructor(
    private readonly repository: PendingServersRepository,
    private readonly presenter: AdminServerPresenterManager,
    private readonly policy: HostRulePolicyManager,
    private readonly notices: SubmitterNoticeManager,
    private readonly audit: AdminAuditService,
  ) {}

  async list(status: ServerState): Promise<AdminServerView[]> {
    const records = await this.repository.findByStatus(status);
    return records.map((record) => this.presenter.toView(record));
  }

  async get(id: string): Promise<AdminServerView> {
    return this.presenter.toView(await this.require(id));
  }

  async approve(adminId: string, id: string): Promise<AdminServerView> {
    const record = await this.require(id);
    if (record.status !== ServerState.PENDING_APPROVAL) throw this.notPending();
    await this.policy.assertAllowed({ host: record.urlHost });
    const moved = await this.repository.decide(
      id,
      [ServerState.PENDING_APPROVAL],
      ServerState.APPROVED,
      adminId,
      null,
    );
    if (!moved) throw this.notPending();
    const decided = await this.require(id);
    await this.audit.record(
      adminId,
      AdminAuditAction.SERVER_APPROVED,
      AdminAuditTarget.MCP_SERVER,
      id,
      { host: record.urlHost, owner: record.ownerUserId, toolCount: record.tools.length },
    );
    await this.notices.approved({
      serverId: id,
      ownerUserId: record.ownerUserId,
      serverName: record.name,
      decidedAt: decided.decidedAt ?? new Date(),
    });
    this.logger.log(`approve: admin=${adminId} server=${id}`);
    return this.presenter.toView(decided);
  }

  async reject(adminId: string, id: string, reason: string): Promise<AdminServerView> {
    const record = await this.require(id);
    if (!REJECTABLE_FROM.includes(record.status)) throw this.notPending();
    const moved = await this.repository.decide(
      id,
      REJECTABLE_FROM,
      ServerState.REJECTED,
      adminId,
      reason,
    );
    if (!moved) throw this.notPending();
    const decided = await this.require(id);
    await this.audit.record(
      adminId,
      AdminAuditAction.SERVER_REJECTED,
      AdminAuditTarget.MCP_SERVER,
      id,
      {
        host: record.urlHost,
        owner: record.ownerUserId,
        from: record.status,
        reasonLength: reason.length,
      },
    );
    await this.notices.rejected({
      serverId: id,
      ownerUserId: record.ownerUserId,
      serverName: record.name,
      decidedAt: decided.decidedAt ?? new Date(),
      reason,
    });
    this.logger.log(`reject: admin=${adminId} server=${id} from=${record.status}`);
    return this.presenter.toView(decided);
  }

  private async require(id: string): Promise<PendingServerRecord> {
    const record = await this.repository.findById(id);
    if (record === null) {
      throw new NotFoundException({
        message: 'MCP server not found',
        errorCode: CurationErrorCode.NOT_FOUND,
      });
    }
    return record;
  }

  private notPending(): ConflictException {
    return new ConflictException({
      message: 'The server is not waiting for a decision',
      errorCode: CurationErrorCode.SERVER_NOT_PENDING,
    });
  }
}
