import { Injectable, Logger } from '@nestjs/common';

import { OrganizationRepository } from '../repositories/organization.repository';
import { RUNNER_NOT_EVALUATED } from '../constants/runner-policy.constants';
import { evaluateRunnerReport, readRunnerPolicy } from '../utilities/runner-compliance.utility';

import type { RunnerComplianceDecision, RunnerReport } from '../types/runner-policy.types';

/**
 * F100: judges a runner's self-reported version and platform against the
 * policies of the organizations its owner belongs to.
 *
 * Staged and fail-open. Nothing here can refuse unless an administrator set
 * mode `enforce`, and any error reading policies lets the runner through: a
 * database hiccup must not take a fleet offline.
 */
@Injectable()
export class RunnerPolicyService {
  private readonly logger = new Logger(RunnerPolicyService.name);

  constructor(private readonly repo: OrganizationRepository) {}

  async evaluate(userId: string, report: RunnerReport): Promise<RunnerComplianceDecision> {
    try {
      const rows = await this.repo.listPoliciesForUser(userId);
      return evaluateRunnerReport(rows.map(readRunnerPolicy), report);
    } catch (error) {
      this.logger.warn(
        `runner policy lookup failed, allowing the runner: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return RUNNER_NOT_EVALUATED;
    }
  }
}
