import { vi } from 'vitest';
import type { RabbitMQService } from '@claw/shared-rabbitmq';

import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import type { WorkspaceAdapterFactory } from '../../adapters/workspace-adapter.factory';
import type { OAuthTokenManager } from '../../managers/oauth-token.manager';
import type { WorkspaceHealthManager } from '../../managers/workspace-health.manager';
import type { WorkspaceSyncManager } from '../../managers/workspace-sync.manager';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';
import type { ProviderAppConfigService } from '../provider-app-config.service';
import type { WorkspaceEntitlementService } from '../workspace-entitlement.service';
import { WorkspaceConnectorService } from '../workspace-connector.service';

/**
 * TD-040. `POST /workspace/oauth/test-pat` is open to every user who may
 * connect their own tools, and GitLab's adapter sends the PAT to the base URL
 * it is handed. The outbound guard may only be told "this destination is
 * allowed" for an ADMIN-configured base, so a base URL typed into this request
 * is accepted only when an admin already configured that host for the
 * provider. Before this, any user could aim the server at an internal host and
 * read the answer back as CONNECTED / DEGRADED / DISCONNECTED.
 */

const validatePat = vi.fn();
const list = vi.fn();

function buildService(): WorkspaceConnectorService {
  const factory: Partial<WorkspaceAdapterFactory> = {
    getAdapter: vi.fn().mockReturnValue({ validatePat }),
  };
  const appConfigs: Partial<ProviderAppConfigService> = { list };
  return new WorkspaceConnectorService(
    {} as Partial<WorkspaceConnectorRepository> as WorkspaceConnectorRepository,
    factory as WorkspaceAdapterFactory,
    {} as Partial<OAuthTokenManager> as OAuthTokenManager,
    {} as Partial<WorkspaceHealthManager> as WorkspaceHealthManager,
    {} as Partial<WorkspaceSyncManager> as WorkspaceSyncManager,
    appConfigs as ProviderAppConfigService,
    {} as Partial<RabbitMQService> as RabbitMQService,
    {} as Partial<WorkspaceEntitlementService> as WorkspaceEntitlementService,
  );
}

describe('WorkspaceConnectorService.testPat — base URL provenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validatePat.mockResolvedValue({ status: WorkspaceConnectorStatus.CONNECTED, latencyMs: 1 });
    list.mockResolvedValue([
      { publicConfig: { apiBaseUrl: 'https://gitlab.acme.example/api/v4' } },
      { publicConfig: { siteUrl: 'https://gitlab.other.example' } },
      { publicConfig: null },
    ]);
  });

  it('tests against the provider default when no base URL is given', async () => {
    const result = await buildService().testPat({
      provider: WorkspaceProvider.GITLAB,
      personalAccessToken: 'glpat-x',
    });
    expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
    expect(validatePat).toHaveBeenCalledWith('glpat-x', undefined);
    expect(list).not.toHaveBeenCalled();
  });

  it.each([
    ['apiBaseUrl', 'https://gitlab.acme.example'],
    ['siteUrl', 'https://gitlab.other.example/api/v4'],
  ])('accepts a base URL whose host an admin configured (%s)', async (_field, baseUrl) => {
    await buildService().testPat({
      provider: WorkspaceProvider.GITLAB,
      personalAccessToken: 'glpat-x',
      baseUrl,
    });
    expect(list).toHaveBeenCalledWith(WorkspaceProvider.GITLAB);
    expect(validatePat).toHaveBeenCalledWith('glpat-x', baseUrl);
  });

  it.each([
    ['an internal service', 'http://claw-auth-service:4001'],
    ['a host the user owns', 'https://collector.attacker.example'],
    ['a private address', 'http://10.0.0.8'],
  ])('refuses %s no admin configured, before the PAT is sent', async (_label, baseUrl) => {
    await expect(
      buildService().testPat({
        provider: WorkspaceProvider.GITLAB,
        personalAccessToken: 'glpat-x',
        baseUrl,
      }),
    ).rejects.toMatchObject({ code: 'UNSAFE_BASE_URL' });
    expect(validatePat).not.toHaveBeenCalled();
  });

  it('still refuses the cloud metadata address outright', async () => {
    await expect(
      buildService().testPat({
        provider: WorkspaceProvider.GITLAB,
        personalAccessToken: 'glpat-x',
        baseUrl: 'http://169.254.169.254',
      }),
    ).rejects.toMatchObject({ code: 'UNSAFE_BASE_URL' });
    expect(list).not.toHaveBeenCalled();
    expect(validatePat).not.toHaveBeenCalled();
  });
});
