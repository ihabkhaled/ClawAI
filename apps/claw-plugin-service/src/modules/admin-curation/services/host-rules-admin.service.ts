import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type AdminRuleView } from '@claw/shared-types';

import { AdminAuditAction, AdminAuditTarget } from '../../../common/enums/admin-audit-action.enum';
import { CurationErrorCode } from '../../../common/enums/curation-error-code.enum';
import { HOST_RULES_MAX } from '../../host-rules/constants/host-rules.constants';
import { HostRulesRepository } from '../../host-rules/repositories/host-rules.repository';
import { type HostRuleRecord } from '../../host-rules/types/host-rules.types';
import { normalizeRulePattern } from '../../host-rules/utilities/match-rule-pattern.utility';
import { type CreateRuleBody } from '../dto/curation.dto';
import { AdminAuditService } from './admin-audit.service';

@Injectable()
export class HostRulesAdminService {
  private readonly logger = new Logger(HostRulesAdminService.name);

  constructor(
    private readonly repository: HostRulesRepository,
    private readonly audit: AdminAuditService,
  ) {}

  async list(): Promise<AdminRuleView[]> {
    return (await this.repository.findAll()).map((rule) => this.toView(rule));
  }

  async create(adminId: string, body: CreateRuleBody): Promise<AdminRuleView> {
    if ((await this.repository.count()) >= HOST_RULES_MAX) {
      throw new UnprocessableEntityException({
        message: 'Too many rules',
        errorCode: CurationErrorCode.RULE_INVALID,
      });
    }
    const pattern = normalizeRulePattern(body.match, body.pattern.replace(/^\*\./u, ''));
    const created = await this.repository.create({
      kind: body.kind,
      match: body.match,
      pattern,
      note: body.note ?? null,
      createdBy: adminId,
    });
    if (created === null) {
      throw new ConflictException({
        message: 'That rule already exists',
        errorCode: CurationErrorCode.RULE_EXISTS,
      });
    }
    await this.audit.record(
      adminId,
      AdminAuditAction.RULE_ADDED,
      AdminAuditTarget.HOST_RULE,
      created.id,
      {
        kind: body.kind,
        match: body.match,
        pattern,
      },
    );
    this.logger.log(`create: admin=${adminId} rule=${created.id} ${body.kind} ${body.match}`);
    return this.toView(created);
  }

  async remove(adminId: string, id: string): Promise<void> {
    const removed = await this.repository.delete(id);
    if (removed === null) {
      throw new NotFoundException({
        message: 'Rule not found',
        errorCode: CurationErrorCode.NOT_FOUND,
      });
    }
    await this.audit.record(
      adminId,
      AdminAuditAction.RULE_REMOVED,
      AdminAuditTarget.HOST_RULE,
      id,
      {
        kind: removed.kind,
        match: removed.match,
        pattern: removed.pattern,
      },
    );
  }

  private toView(rule: HostRuleRecord): AdminRuleView {
    return {
      id: rule.id,
      kind: rule.kind,
      match: rule.match,
      pattern: rule.pattern,
      note: rule.note,
      createdBy: rule.createdBy,
      createdAt: rule.createdAt.toISOString(),
    };
  }
}
