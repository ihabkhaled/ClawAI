import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import {
  ORGANIZATION_USAGE_DEFAULT_AGENT_URL,
  ORGANIZATION_USAGE_SCOPE_PATH_PREFIX,
  ORGANIZATION_USAGE_SCOPE_TIMEOUT_MS,
} from '../constants/usage-attribution.constants';
import { organizationUsageScopeSchema } from '../schemas/organization-usage-scope.schema';
import { type OrganizationUsageScope } from '../types/usage-attribution.types';

/**
 * Asks agent-service — which owns organizations — whether a user administers
 * one, and if so who its members are.
 *
 * Auth never reads the organization tables: membership crosses the boundary
 * over HTTP, and the administrator check is made there, by the service that
 * owns the rows, not re-derived here from a copy.
 */
@Injectable()
export class AgentOrganizationClient {
  private readonly logger = new Logger(AgentOrganizationClient.name);

  async getUsageScope(
    organizationId: string,
    requesterId: string,
  ): Promise<OrganizationUsageScope> {
    const path = `${ORGANIZATION_USAGE_SCOPE_PATH_PREFIX}/${encodeURIComponent(
      organizationId,
    )}/usage-scope?requesterId=${encodeURIComponent(requesterId)}`;
    const response = await httpRequest<unknown>({
      url: `${AppConfig.get().AGENT_SERVICE_URL ?? ORGANIZATION_USAGE_DEFAULT_AGENT_URL}${path}`,
      method: HttpMethod.GET,
      headers: { Authorization: buildInterServiceAuthHeader() },
      timeoutMs: ORGANIZATION_USAGE_SCOPE_TIMEOUT_MS,
    });
    if (response.status === 404) throw new NotFoundException('Organization not found');
    if (response.status === 403) {
      throw new ForbiddenException('Only an owner or admin may read organization usage');
    }
    if (!response.ok) {
      this.logger.error(`getUsageScope: agent status=${String(response.status)}`);
      throw new ServiceUnavailableException('Organization usage is unavailable');
    }
    const parsed = organizationUsageScopeSchema.safeParse(response.data);
    if (!parsed.success || parsed.data.organizationId !== organizationId) {
      this.logger.error('getUsageScope: response failed schema or organization check');
      throw new ServiceUnavailableException('Organization usage is unavailable');
    }
    return parsed.data;
  }
}
