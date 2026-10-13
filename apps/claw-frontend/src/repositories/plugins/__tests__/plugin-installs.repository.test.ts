import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pluginAdminRepository } from '../plugin-admin.repository';
import { pluginInstallsRepository } from '../plugin-installs.repository';

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const { apiClient } = await import('@/services/shared/api-client');
const mocks = {
  get: apiClient.get as unknown as ReturnType<typeof vi.fn>,
  post: apiClient.post as unknown as ReturnType<typeof vi.fn>,
  put: apiClient.put as unknown as ReturnType<typeof vi.fn>,
  patch: apiClient.patch as unknown as ReturnType<typeof vi.fn>,
  delete: apiClient.delete as unknown as ReturnType<typeof vi.fn>,
};

describe('pluginInstallsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of Object.values(mocks)) {
      mock.mockResolvedValue({ data: { ok: true } });
    }
  });

  it('lists installs and mentions', async () => {
    await pluginInstallsRepository.list();
    expect(mocks.get).toHaveBeenCalledWith('/plugins/installs');
    await pluginInstallsRepository.mentions();
    expect(mocks.get).toHaveBeenLastCalledWith('/plugins/installs/mentions');
  });

  it('installs, updates and uninstalls by id', async () => {
    await pluginInstallsRepository.install({ slug: 'weather', version: '1.0.0' });
    expect(mocks.post).toHaveBeenCalledWith('/plugins/installs', {
      slug: 'weather',
      version: '1.0.0',
    });
    await pluginInstallsRepository.update('a/b', { enabled: false });
    expect(mocks.patch).toHaveBeenCalledWith('/plugins/installs/a%2Fb', { enabled: false });
    await pluginInstallsRepository.uninstall('i1');
    expect(mocks.delete).toHaveBeenCalledWith('/plugins/installs/i1');
  });

  it('puts and deletes the credential and returns only the status', async () => {
    mocks.put.mockResolvedValue({
      data: { hasCredential: true, kind: 'API_KEY', updatedAt: '2026-10-13T00:00:00Z' },
    });
    const status = await pluginInstallsRepository.putCredential('i1', {
      kind: 'API_KEY',
      value: 'secret',
    });
    expect(mocks.put).toHaveBeenCalledWith('/plugins/installs/i1/credential', {
      kind: 'API_KEY',
      value: 'secret',
    });
    expect(JSON.stringify(status)).not.toContain('secret');
    await pluginInstallsRepository.deleteCredential('i1');
    expect(mocks.delete).toHaveBeenCalledWith('/plugins/installs/i1/credential');
  });

  it('grants and revokes a tool consent', async () => {
    await pluginInstallsRepository.grantConsent('i1', { toolName: 'send', level: 'WRITE' });
    expect(mocks.post).toHaveBeenCalledWith('/plugins/installs/i1/consent', {
      toolName: 'send',
      level: 'WRITE',
    });
    await pluginInstallsRepository.revokeConsent('i1', 'send it');
    expect(mocks.delete).toHaveBeenCalledWith('/plugins/installs/i1/consent/send%20it');
  });
});

describe('pluginAdminRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of Object.values(mocks)) {
      mock.mockResolvedValue({ data: [] });
    }
  });

  it('lists the catalog and the settings', async () => {
    await pluginAdminRepository.listCatalog();
    expect(mocks.get).toHaveBeenCalledWith('/plugins/admin/catalog');
    await pluginAdminRepository.listSettings();
    expect(mocks.get).toHaveBeenLastCalledWith('/plugins/admin/settings');
  });

  it('patches one catalog entry and the settings', async () => {
    await pluginAdminRepository.updateCatalogEntry('web fetch', { globallyEnabled: false });
    expect(mocks.patch).toHaveBeenCalledWith('/plugins/admin/catalog/web%20fetch', {
      globallyEnabled: false,
    });
    await pluginAdminRepository.updateSettings({ values: { 'loop.maxRounds': 4 } });
    expect(mocks.patch).toHaveBeenLastCalledWith('/plugins/admin/settings', {
      values: { 'loop.maxRounds': 4 },
    });
  });
});
