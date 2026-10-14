import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginServerAuthKind } from '@/enums/plugin-server-auth-kind.enum';
import { apiClient } from '@/services/shared/api-client';
import type { CreatePluginServerRequest } from '@/types/plugin-servers.types';

import { pluginServersRepository } from '../plugin-servers.repository';

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const reply = (data: unknown) => ({ data, status: 200 });

describe('pluginServersRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists servers and the plan cap', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(
      reply({ servers: [{ id: 's1', name: 'A', status: 'APPROVED' }], limit: 5 }),
    );
    const list = await pluginServersRepository.list();
    expect(apiClient.get).toHaveBeenCalledWith('/plugins/servers');
    expect(list.limit).toBe(5);
    expect(list.servers[0]?.id).toBe('s1');
  });

  it('creates a server and reads the nested server plus its discovered tools', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(
      reply({
        server: { id: 's2', name: 'B', status: 'PENDING_APPROVAL' },
        discoveredTools: [{ name: 'search', riskLevel: 'WRITE' }],
      }),
    );
    const body: CreatePluginServerRequest = {
      name: 'B',
      url: 'https://b.example.com',
      authKind: PluginServerAuthKind.None,
      acknowledgedRisk: true,
    };
    const server = await pluginServersRepository.create(body);
    expect(apiClient.post).toHaveBeenCalledWith('/plugins/servers', body);
    expect(server?.tools.map((tool) => tool.name)).toEqual(['search']);
  });

  it('creates a server from a flat answer', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(reply({ id: 's3', name: 'C' }));
    const server = await pluginServersRepository.create({
      name: 'C',
      url: 'https://c.example.com',
      authKind: PluginServerAuthKind.None,
      acknowledgedRisk: true,
    });
    expect(server?.id).toBe('s3');
  });

  it('updates and removes by encoded id', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue(reply({ id: 'a/b', enabled: false }));
    const server = await pluginServersRepository.update('a/b', { enabled: false });
    expect(apiClient.patch).toHaveBeenCalledWith('/plugins/servers/a%2Fb', { enabled: false });
    expect(server?.enabled).toBe(false);
    vi.mocked(apiClient.delete).mockResolvedValue(reply(undefined));
    await pluginServersRepository.remove('s1');
    expect(apiClient.delete).toHaveBeenCalledWith('/plugins/servers/s1');
  });

  it('discovers tools with POST /:id/discover', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(
      reply({ tools: [{ name: 'a', description: 'x', riskLevel: 'READ', enabled: true }] }),
    );
    const tools = await pluginServersRepository.discover('s1');
    expect(apiClient.post).toHaveBeenCalledWith('/plugins/servers/s1/discover', {});
    expect(tools).toHaveLength(1);
  });
});
