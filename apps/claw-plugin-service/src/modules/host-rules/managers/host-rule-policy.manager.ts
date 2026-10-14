import { ForbiddenException, Injectable, Logger } from '@nestjs/common';

import { CurationErrorCode } from '../../../common/enums/curation-error-code.enum';
import { HostRulesRepository } from '../repositories/host-rules.repository';
import { type RuleSubject, type RuleVerdict } from '../types/host-rules.types';
import { evaluateRules } from '../utilities/evaluate-rules.utility';

/**
 * The admin allow/deny rules, applied wherever a host, publisher or slug is accepted: a user
 * registering a server, an admin approving one, an admin saving a curated entry. Read from the
 * database on each check (the table is tiny), so an edit takes effect on the next request in every replica.
 */
@Injectable()
export class HostRulePolicyManager {
  private readonly logger = new Logger(HostRulePolicyManager.name);

  constructor(private readonly rules: HostRulesRepository) {}

  async evaluate(subject: RuleSubject): Promise<RuleVerdict> {
    return evaluateRules(await this.rules.findAll(), subject);
  }

  /** Throws 403 PLUGIN_CURATION_HOST_DENIED. The message never names the rule. */
  async assertAllowed(subject: RuleSubject): Promise<void> {
    const verdict = await this.evaluate(subject);
    if (verdict.allowed) return;
    this.logger.warn(`assertAllowed: refused (${verdict.reason})`);
    throw new ForbiddenException({
      message: 'An admin rule does not allow this server or plugin',
      errorCode: CurationErrorCode.HOST_DENIED,
    });
  }
}
