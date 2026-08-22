import { ConfluenceAdapter } from '../confluence.adapter';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';

global.fetch = jest.fn();

describe('ConfluenceAdapter', () => {
  let adapter: ConfluenceAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ConfluenceAdapter();
  });

  describe('healthCheck', () => {
    it('should return CONNECTED on 200 response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const result = await adapter.healthCheck('token-abc');
      expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
    });

    it('should return DISCONNECTED on 401', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
      const result = await adapter.healthCheck('bad-token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
      expect(result.errorMessage).toBe('Unauthorized');
    });

    it('should return DEGRADED on non-401 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });
      const result = await adapter.healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DEGRADED);
    });

    it('should return DISCONNECTED on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await adapter.healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
    });
  });

  describe('getCapabilities', () => {
    it('supports OAuth only, not PAT', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsOAuth).toBe(true);
      expect(caps.supportsPat).toBe(false);
    });

    it('does not support delta sync or webhooks', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsDeltaSync).toBe(false);
      expect(caps.supportsWebhooks).toBe(false);
    });

    it('includes DOCUMENT in object types', () => {
      expect(adapter.getCapabilities().objectTypes).toEqual(['DOCUMENT']);
    });
  });

  describe('getDefaultScopes', () => {
    it('returns a non-empty array', () => {
      expect(adapter.getDefaultScopes().length).toBeGreaterThan(0);
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('exchanges a code for tokens', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          scope: 'read:content:confluence offline_access',
        }),
      });
      const tokens = await adapter.exchangeCodeForTokens('code', 'https://cb', undefined, {
        clientId: 'id',
        clientSecret: 'secret',
      });
      expect(tokens.accessToken).toBe('at');
      expect(tokens.scopes).toEqual(['read:content:confluence', 'offline_access']);
    });

    it('throws when app credentials are missing', async () => {
      await expect(
        adapter.exchangeCodeForTokens('code', 'https://cb', undefined, {}),
      ).rejects.toThrow(/clientId and clientSecret/);
    });

    it('throws on a non-ok token response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_grant' }),
      });
      await expect(
        adapter.exchangeCodeForTokens('code', 'https://cb', undefined, {
          clientId: 'id',
          clientSecret: 'secret',
        }),
      ).rejects.toThrow();
    });
  });

  describe('refreshTokens', () => {
    it('refreshes and normalizes the token response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'at2', expires_in: 3600 }),
      });
      const tokens = await adapter.refreshTokens('rt', { clientId: 'id', clientSecret: 'secret' });
      expect(tokens.accessToken).toBe('at2');
    });

    it('throws when app credentials are missing', async () => {
      await expect(adapter.refreshTokens('rt', {})).rejects.toThrow(/clientId and clientSecret/);
    });
  });

  describe('syncObjects', () => {
    const resource = (overrides: Record<string, unknown> = {}) => ({
      id: 'cloud1',
      url: 'https://acme.atlassian.net',
      name: 'Acme',
      scopes: ['read:content:confluence'],
      ...overrides,
    });

    const page = (overrides: Record<string, unknown> = {}) => ({
      id: 'page1',
      type: 'page',
      title: 'Runbook',
      status: 'current',
      _links: { webui: '/spaces/ENG/pages/page1' },
      history: { createdBy: { accountId: 'acc1' }, createdDate: '2026-01-01T00:00:00Z' },
      version: { when: '2026-01-02T00:00:00Z', number: 3 },
      body: { storage: { value: '<p>content</p>' } },
      space: { key: 'ENG' },
      ...overrides,
    });

    it('picks the confluence-scoped resource, fetches pages, and maps them', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [resource()] })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [page()] }) });

      const result = await adapter.syncObjects('token');

      expect(result.objects).toEqual([
        expect.objectContaining({
          externalId: 'page1',
          type: 'DOCUMENT',
          title: 'Runbook',
          url: 'https://acme.atlassian.net/wiki/spaces/ENG/pages/page1',
          metadata: expect.objectContaining({ cloudId: 'cloud1', spaceKey: 'ENG' }),
        }),
      ]);
    });

    it('falls back to the first resource when none advertise a confluence scope', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [resource({ id: 'fallback', scopes: ['read:jira-work'] })],
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });
      const result = await adapter.syncObjects('token');
      expect(result.objects).toEqual([]);
    });

    it('returns an empty result when no resource is accessible at all', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [] });
      const result = await adapter.syncObjects('token');
      expect(result).toEqual(
        expect.objectContaining({ objectsFound: 0, objectsSynced: 0, objects: [] }),
      );
    });

    it('throws when the resources fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(adapter.syncObjects('token')).rejects.toThrow(/HTTP 500/);
    });

    it('throws when the pages fetch fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [resource()] })
        .mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(adapter.syncObjects('token')).rejects.toThrow(/HTTP 500/);
    });
  });

  describe('fetchObjectDetails', () => {
    it('DOCUMENT — resolves by externalId + cloudId metadata', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'page1',
          type: 'page',
          title: 'Runbook',
          status: 'current',
          _links: { webui: '/spaces/ENG/pages/page1' },
        }),
      });
      const live = await adapter.fetchObjectDetails('token', 'page1', 'DOCUMENT', {
        cloudId: 'cloud1',
        baseUrl: 'https://acme.atlassian.net',
      });
      expect(live?.title).toBe('Runbook');
      expect(live?.url).toBe('https://acme.atlassian.net/wiki/spaces/ENG/pages/page1');
    });

    it('returns null for a non-DOCUMENT object type', async () => {
      const live = await adapter.fetchObjectDetails('token', 'page1', 'TICKET');
      expect(live).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null when cloudId metadata is missing', async () => {
      const live = await adapter.fetchObjectDetails('token', 'page1', 'DOCUMENT');
      expect(live).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const live = await adapter.fetchObjectDetails('token', 'missing', 'DOCUMENT', {
        cloudId: 'cloud1',
      });
      expect(live).toBeNull();
    });

    it('throws on a non-404 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(
        adapter.fetchObjectDetails('token', 'page1', 'DOCUMENT', { cloudId: 'cloud1' }),
      ).rejects.toThrow(/HTTP 500/);
    });
  });

  describe('write actions', () => {
    describe('CREATE_CONFLUENCE', () => {
      it('creates a page under the first accessible site', async () => {
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: 'cloud1', url: 'https://acme.atlassian.net' }],
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'new-page', _links: { webui: '/new-page' } }),
          });
        const result = await adapter.executeWriteAction('token', 'CREATE_CONFLUENCE', {
          title: 'New Page',
          spaceKey: 'ENG',
          body: '<p>hi</p>',
        });
        expect(result).toEqual({ success: true, externalId: 'new-page', url: '/new-page' });
      });

      it('returns success:false when no Confluence site is accessible', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [] });
        const result = await adapter.executeWriteAction('token', 'CREATE_CONFLUENCE', {
          title: 'x',
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('No Confluence site');
      });

      it('returns success:false when the site lookup fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
        const result = await adapter.executeWriteAction('token', 'CREATE_CONFLUENCE', {
          title: 'x',
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('site lookup failed');
      });

      it('returns success:false on a non-ok create response', async () => {
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'cloud1', url: 'x' }] })
          .mockResolvedValueOnce({ ok: false, status: 400 });
        const result = await adapter.executeWriteAction('token', 'CREATE_CONFLUENCE', {
          title: 'x',
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('400');
      });
    });

    describe('EDIT_CONFLUENCE', () => {
      it('increments expectedVersion and PUTs the update', async () => {
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'cloud1', url: 'x' }] })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              id: 'page1',
              version: { number: 4 },
              _links: { webui: '/page1' },
            }),
          });
        const result = await adapter.executeWriteAction('token', 'EDIT_CONFLUENCE', {
          pageId: 'page1',
          expectedVersion: 3,
          title: 'Updated',
          body: '<p>new</p>',
        });
        expect(result.success).toBe(true);
        expect(result.metadata).toEqual({ newVersion: 4 });
        const [, init] = (global.fetch as jest.Mock).mock.calls[1] as [string, RequestInit];
        expect(JSON.parse(init.body as string).version).toEqual({ number: 4 });
      });
    });

    it('returns success:false for an unsupported action type', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'cloud1', url: 'x' }],
      });
      const result = await adapter.executeWriteAction('token', 'DELETE_CONFLUENCE', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('unsupported action type');
    });
  });

  describe('supportsWrite / getSupportedActionTypes', () => {
    it('supports write actions', () => {
      expect(adapter.supportsWrite()).toBe(true);
    });

    it('lists CREATE_CONFLUENCE and EDIT_CONFLUENCE', () => {
      expect(adapter.getSupportedActionTypes()).toEqual(
        expect.arrayContaining(['CREATE_CONFLUENCE', 'EDIT_CONFLUENCE']),
      );
    });
  });
});
