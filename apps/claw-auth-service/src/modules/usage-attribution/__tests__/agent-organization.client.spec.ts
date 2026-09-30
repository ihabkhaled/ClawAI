import { vi } from 'vitest';
import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { AgentOrganizationClient } from '../clients/agent-organization.client';

vi.mock('@claw/shared-utilities', () => ({ httpRequest: vi.fn() }));
vi.mock('../../../app/config/app.config');

describe('AgentOrganizationClient', () => {
  const client = new AgentOrganizationClient();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppConfig.get).mockReturnValue({
      AGENT_SERVICE_URL: 'https://agent-service:4015',
      INTER_SERVICE_AUTH_TOKEN: 'service-token-with-at-least-32-characters',
    } as ReturnType<typeof AppConfig.get>);
  });

  it('asks agent-service with the service token and returns the member ids', async () => {
    vi.mocked(httpRequest).mockResolvedValue({
      ok: true,
      status: 200,
      data: { organizationId: 'org-1', memberUserIds: ['u1', 'u2'] },
    });

    await expect(client.getUsageScope('org-1', 'u1')).resolves.toEqual({
      organizationId: 'org-1',
      memberUserIds: ['u1', 'u2'],
    });
    expect(httpRequest).toHaveBeenCalledWith({
      url: 'https://agent-service:4015/api/v1/internal/agent/organizations/org-1/usage-scope?requesterId=u1',
      method: HttpMethod.GET,
      headers: { Authorization: 'Service service-token-with-at-least-32-characters' },
      timeoutMs: 5_000,
    });
  });

  it('maps a stranger to 404 and a plain member to 403', async () => {
    vi.mocked(httpRequest).mockResolvedValueOnce({ ok: false, status: 404, data: null });
    await expect(client.getUsageScope('org-1', 'x')).rejects.toBeInstanceOf(NotFoundException);
    vi.mocked(httpRequest).mockResolvedValueOnce({ ok: false, status: 403, data: null });
    await expect(client.getUsageScope('org-1', 'x')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fails closed on an outage or an answer for another organization', async () => {
    vi.mocked(httpRequest).mockResolvedValueOnce({ ok: false, status: 500, data: null });
    await expect(client.getUsageScope('org-1', 'x')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    vi.mocked(httpRequest).mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { organizationId: 'org-2', memberUserIds: ['u9'] },
    });
    await expect(client.getUsageScope('org-1', 'x')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
