import { SharePointAdapter } from '../sharepoint.adapter';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';

global.fetch = jest.fn();

describe('SharePointAdapter', () => {
  let adapter: SharePointAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new SharePointAdapter();
  });

  describe('healthCheck', () => {
    it('should return CONNECTED on 200 response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const result = await adapter.healthCheck('token-abc');
      expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
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
      expect(result.errorMessage).toBe('HTTP 503');
    });

    it('should return DISCONNECTED on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await adapter.healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
      expect(result.errorMessage).toBe('ECONNREFUSED');
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
      const scopes = adapter.getDefaultScopes();
      expect(Array.isArray(scopes)).toBe(true);
      expect(scopes.length).toBeGreaterThan(0);
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
          scope: 'Sites.Read.All offline_access',
        }),
      });
      const tokens = await adapter.exchangeCodeForTokens('code', 'https://cb', 'verifier', {
        clientId: 'id',
        clientSecret: 'secret',
      });
      expect(tokens.accessToken).toBe('at');
      expect(tokens.scopes).toEqual(['Sites.Read.All', 'offline_access']);
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
        json: async () => ({ access_token: 'at2', refresh_token: 'rt2', expires_in: 3600 }),
      });
      const tokens = await adapter.refreshTokens('rt', { clientId: 'id', clientSecret: 'secret' });
      expect(tokens.accessToken).toBe('at2');
    });

    it('throws when app credentials are missing', async () => {
      await expect(adapter.refreshTokens('rt', {})).rejects.toThrow(/clientId and clientSecret/);
    });
  });

  describe('syncObjects', () => {
    const site = (overrides: Record<string, unknown> = {}) => ({
      id: 'site1',
      name: 'Engineering',
      displayName: 'Engineering Hub',
      webUrl: 'https://contoso.sharepoint.com/sites/eng',
      description: 'Team site',
      createdDateTime: '2026-01-01T00:00:00Z',
      lastModifiedDateTime: '2026-01-02T00:00:00Z',
      ...overrides,
    });

    it('maps sites to SyncedObject', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [site()] }),
      });

      const result = await adapter.syncObjects('token');

      expect(result.objectsFound).toBe(1);
      expect(result.objects).toEqual([
        expect.objectContaining({
          externalId: 'site1',
          type: 'DOCUMENT',
          title: 'Engineering Hub',
          content: 'Team site',
          url: 'https://contoso.sharepoint.com/sites/eng',
        }),
      ]);
    });

    it('falls back to name when displayName is absent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [site({ displayName: undefined })] }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.objects[0]?.title).toBe('Engineering');
    });

    it('throws on a non-ok list response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(adapter.syncObjects('token')).rejects.toThrow(/HTTP 500/);
    });
  });

  describe('fetchObjectDetails', () => {
    it('DOCUMENT — resolves by externalId', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'site1',
          name: 'Engineering',
          displayName: 'Engineering Hub',
          webUrl: 'https://contoso.sharepoint.com/sites/eng',
          createdDateTime: '2026-01-01T00:00:00Z',
          lastModifiedDateTime: '2026-01-02T00:00:00Z',
        }),
      });
      const live = await adapter.fetchObjectDetails('token', 'site1', 'DOCUMENT');
      expect(live?.title).toBe('Engineering Hub');
    });

    it('returns null for a non-DOCUMENT object type', async () => {
      const live = await adapter.fetchObjectDetails('token', 'site1', 'REPOSITORY');
      expect(live).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const live = await adapter.fetchObjectDetails('token', 'missing', 'DOCUMENT');
      expect(live).toBeNull();
    });

    it('throws on a non-404 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(adapter.fetchObjectDetails('token', 'site1', 'DOCUMENT')).rejects.toThrow(
        /HTTP 500/,
      );
    });
  });

  describe('downloadFileContent', () => {
    it('streams file bytes when driveId metadata is present', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: {},
        headers: new Map([
          ['content-length', '512'],
          ['content-type', 'application/pdf'],
        ]),
      });
      const stream = await adapter.downloadFileContent('token', 'item1', {
        driveId: 'drive1',
        name: 'report.pdf',
      });
      expect(stream?.filename).toBe('report.pdf');
      expect(stream?.sizeBytes).toBe(512);
    });

    it('returns null when driveId metadata is missing — cannot resolve without it', async () => {
      const stream = await adapter.downloadFileContent('token', 'item1');
      expect(stream).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const stream = await adapter.downloadFileContent('token', 'item1', { driveId: 'drive1' });
      expect(stream).toBeNull();
    });

    it('throws on a non-404 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, body: null });
      await expect(
        adapter.downloadFileContent('token', 'item1', { driveId: 'drive1' }),
      ).rejects.toThrow(/HTTP 500/);
    });
  });

  describe('write actions', () => {
    describe('UPLOAD_SHAREPOINT', () => {
      it('PUTs the decoded bytes to the site drive content endpoint', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ id: 'new-item', webUrl: 'https://contoso.sharepoint.com/new-item' }),
        });
        const result = await adapter.executeWriteAction('token', 'UPLOAD_SHAREPOINT', {
          siteId: 'site1',
          driveId: 'drive1',
          parentFolderPath: '/Shared Documents',
          fileName: 'report.pdf',
          contentBase64: Buffer.from('hello').toString('base64'),
        });
        expect(result.success).toBe(true);
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/sites/site1/drives/drive1/root:');
        expect(init.method).toBe('PUT');
      });

      it('rejects a file over the simple-upload size limit', async () => {
        const oversized = Buffer.alloc(5 * 1024 * 1024).toString('base64');
        const result = await adapter.executeWriteAction('token', 'UPLOAD_SHAREPOINT', {
          siteId: 'site1',
          driveId: 'drive1',
          parentFolderPath: '/Docs',
          fileName: 'big.bin',
          contentBase64: oversized,
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('FILE_TOO_LARGE_FOR_SIMPLE_UPLOAD');
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    describe('CREATE_SHAREPOINT_LIST_ITEM', () => {
      it('posts fields to the list items endpoint', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ id: 'item1' }),
        });
        const result = await adapter.executeWriteAction('token', 'CREATE_SHAREPOINT_LIST_ITEM', {
          siteId: 'site1',
          listId: 'list1',
          fields: { Title: 'New task' },
        });
        expect(result.success).toBe(true);
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://graph.microsoft.com/v1.0/sites/site1/lists/list1/items');
        expect(JSON.parse(init.body as string)).toEqual({ fields: { Title: 'New task' } });
      });
    });

    describe('UPDATE_SHAREPOINT_LIST_ITEM', () => {
      it('PATCHes the item fields endpoint', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
        await adapter.executeWriteAction('token', 'UPDATE_SHAREPOINT_LIST_ITEM', {
          siteId: 'site1',
          listId: 'list1',
          itemId: 'item1',
          fields: { Status: 'Done' },
        });
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toBe(
          'https://graph.microsoft.com/v1.0/sites/site1/lists/list1/items/item1/fields',
        );
        expect(init.method).toBe('PATCH');
        expect(JSON.parse(init.body as string)).toEqual({ Status: 'Done' });
      });
    });

    it('returns success:false for an unsupported action type', async () => {
      const result = await adapter.executeWriteAction('token', 'DELETE_SHAREPOINT', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('not supported');
    });

    it('catches a thrown error from the dispatched handler', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
      const result = await adapter.executeWriteAction('token', 'CREATE_SHAREPOINT_LIST_ITEM', {
        siteId: 'site1',
        listId: 'list1',
      });
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('network down');
    });
  });

  describe('supportsWrite / getSupportedActionTypes', () => {
    it('supports write actions', () => {
      expect(adapter.supportsWrite()).toBe(true);
    });

    it('lists upload and list-item action types', () => {
      expect(adapter.getSupportedActionTypes()).toEqual(
        expect.arrayContaining([
          'UPLOAD_SHAREPOINT',
          'CREATE_SHAREPOINT_LIST_ITEM',
          'UPDATE_SHAREPOINT_LIST_ITEM',
        ]),
      );
    });
  });
});
