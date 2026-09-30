import { BadRequestException, Injectable } from '@nestjs/common';

import { AgentOrganizationClient } from '../clients/agent-organization.client';
import { ORGANIZATION_USAGE_MAX_MEMBERS } from '../constants/usage-attribution.constants';
import { UsageAttributionRepository } from '../repositories/usage-attribution.repository';
import {
  type OrganizationUsageView,
  type UsageBreakdownView,
  type UsageWindow,
  type UsageWindowQuery,
} from '../types/usage-attribution.types';
import {
  memberLines,
  modelLines,
  sumUsageRows,
  surfaceLines,
} from '../utilities/usage-breakdown.utility';
import { resolveUsageWindow } from '../utilities/usage-window.utility';

/**
 * Where usage went, for the caller or for an organization the caller runs.
 *
 * Counts only — tokens and requests, integers throughout. Cost is left out on
 * purpose, for the same reason the usage view omits it: it is a margin
 * control, not a number a customer is billed by.
 */
@Injectable()
export class UsageAttributionService {
  constructor(
    private readonly repo: UsageAttributionRepository,
    private readonly organizations: AgentOrganizationClient,
  ) {}

  /** The caller's own usage. The user id comes from the token, never a parameter. */
  async breakdownForUser(userId: string, query: UsageWindowQuery): Promise<UsageBreakdownView> {
    const window = this.window(query);
    const [bySurface, byModel] = await Promise.all([
      this.repo.sumByWorkflow([userId], window),
      this.repo.sumByModel([userId], window),
    ]);
    return {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      totals: sumUsageRows(byModel),
      bySurface: surfaceLines(bySurface),
      byModel: modelLines(byModel),
    };
  }

  /**
   * An organization's usage, for an OWNER or ADMIN of it. The membership check
   * happens in agent-service first; a stranger gets its 404 and a plain member
   * its 403 before a single ledger row is read.
   */
  async breakdownForOrganization(
    organizationId: string,
    requesterId: string,
    query: UsageWindowQuery,
  ): Promise<OrganizationUsageView> {
    const window = this.window(query);
    const scope = await this.organizations.getUsageScope(organizationId, requesterId);
    const members = [...new Set(scope.memberUserIds)].slice(0, ORGANIZATION_USAGE_MAX_MEMBERS);
    const [byMember, byModel] = await Promise.all([
      this.repo.sumByUser(members, window),
      this.repo.sumByModel(members, window),
    ]);
    return {
      organizationId,
      from: window.from.toISOString(),
      to: window.to.toISOString(),
      memberCount: members.length,
      totals: sumUsageRows(byModel),
      byMember: memberLines(byMember),
      byModel: modelLines(byModel),
    };
  }

  private window(query: UsageWindowQuery): UsageWindow {
    const window = resolveUsageWindow(query, new Date());
    if (window === null) throw new BadRequestException('Invalid usage window');
    return window;
  }
}
