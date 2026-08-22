import { OneDriveAdapter } from '../onedrive.adapter';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';

global.fetch = jest.fn();

describe('OneDriveAdapter', () => {
  let adapter: OneDriveAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new OneDriveAdapter();
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

    // Regression test for the drift bug this phase found: syncObjects()
    // ignores the incoming deltaToken and always hits the fixed
    // /me/drive/recent endpoint, with deltaTokenOut a bare
    // new Date().toISOString() carrying no real cursor — so advertising
    // supportsDeltaSync: true was a lie nothing backed up.
    it('does not support delta sync or webhooks', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsDeltaSync).toBe(false);
      expect(caps.supportsWebhooks).toBe(false);
    });

    it('includes FILE in object types', () => {
      expect(adapter.getCapabilities().objectTypes).toEqual(['FILE']);
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
          scope: 'Files.Read offline_access',
        }),
      });
      const tokens = await adapter.exchangeCodeForTokens('code', 'https://cb', 'verifier', {
        clientId: 'id',
        clientSecret: 'secret',
      });
      expect(tokens.accessToken).toBe('at');
      expect(tokens.refreshToken).toBe('rt');
      expect(tokens.scopes).toEqual(['Files.Read', 'offline_access']);
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
    const item = (overrides: Record<string, unknown> = {}) => ({
      id: 'item1',
      name: 'report.pdf',
      webUrl: 'https://onedrive.example/report.pdf',
      createdDateTime: '2026-01-01T00:00:00Z',
      lastModifiedDateTime: '2026-01-02T00:00:00Z',
      file: { mimeType: 'application/pdf' },
      size: 1024,
      createdBy: { user: { id: 'u1', displayName: 'Alice' } },
      parentReference: { driveId: 'drive1', path: '/drive/root:/Docs' },
      ...overrides,
    });

    it('maps recent file items to SyncedObject and ignores folders', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          value: [item(), { ...item(), id: 'folder1', file: undefined, folder: {} }],
        }),
      });

      const result = await adapter.syncObjects('token');

      expect(result.objectsFound).toBe(2);
      expect(result.objectsSynced).toBe(1);
      expect(result.objects).toEqual([
        expect.objectContaining({
          externalId: 'item1',
          type: 'FILE',
          title: 'report.pdf',
          authorId: 'u1',
          metadata: expect.objectContaining({ mimeType: 'application/pdf', driveId: 'drive1' }),
        }),
      ]);
    });

    it('ignores the incoming deltaToken — always calls /me/drive/recent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [] }),
      });
      await adapter.syncObjects('token', 'some-stale-cursor');
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain('/me/drive/recent');
      expect(url).not.toContain('some-stale-cursor');
    });

    it('throws on a non-ok list response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(adapter.syncObjects('token')).rejects.toThrow(/HTTP 500/);
    });
  });

  describe('fetchObjectDetails', () => {
    it('FILE — resolves by externalId', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'item1',
          name: 'report.pdf',
          webUrl: 'https://onedrive.example/report.pdf',
          createdDateTime: '2026-01-01T00:00:00Z',
          lastModifiedDateTime: '2026-01-02T00:00:00Z',
          file: { mimeType: 'application/pdf' },
        }),
      });
      const live = await adapter.fetchObjectDetails('token', 'item1', 'FILE');
      expect(live?.title).toBe('report.pdf');
    });

    it('returns null for a non-FILE object type', async () => {
      const live = await adapter.fetchObjectDetails('token', 'item1', 'REPOSITORY');
      expect(live).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const live = await adapter.fetchObjectDetails('token', 'missing', 'FILE');
      expect(live).toBeNull();
    });

    it('throws on a non-404 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(adapter.fetchObjectDetails('token', 'item1', 'FILE')).rejects.toThrow(
        /HTTP 500/,
      );
    });
  });

  describe('downloadFileContent', () => {
    it('streams file bytes with metadata from headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: {},
        headers: new Map([
          ['content-length', '2048'],
          ['content-type', 'application/pdf'],
        ]),
      });
      const stream = await adapter.downloadFileContent('token', 'item1', { name: 'report.pdf' });
      expect(stream?.filename).toBe('report.pdf');
      expect(stream?.mimeType).toBe('application/pdf');
      expect(stream?.sizeBytes).toBe(2048);
    });

    it('returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const stream = await adapter.downloadFileContent('token', 'missing');
      expect(stream).toBeNull();
    });

    it('throws on a non-404 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, body: null });
      await expect(adapter.downloadFileContent('token', 'item1')).rejects.toThrow(/HTTP 500/);
    });
  });

  describe('write actions', () => {
    describe('UPLOAD_ONEDRIVE', () => {
      it('PUTs the decoded bytes to the drive content endpoint', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ id: 'new-item', webUrl: 'https://onedrive.example/new-item' }),
        });
        const result = await adapter.executeWriteAction('token', 'UPLOAD_ONEDRIVE', {
          driveId: 'drive1',
          parentFolderPath: '/Docs',
          fileName: 'report.pdf',
          contentBase64: Buffer.from('hello').toString('base64'),
          mimeType: 'application/pdf',
        });
        expect(result).toEqual({
          success: true,
          externalId: 'new-item',
          url: 'https://onedrive.example/new-item',
        });
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/drives/drive1/root:');
        expect(init.method).toBe('PUT');
      });

      it('rejects a file over the simple-upload size limit', async () => {
        const oversized = Buffer.alloc(5 * 1024 * 1024).toString('base64');
        const result = await adapter.executeWriteAction('token', 'UPLOAD_ONEDRIVE', {
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

    describe('MOVE_ONEDRIVE', () => {
      it('looks up the target folder id then PATCHes the item parent reference', async () => {
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'target-folder-id' }) })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'item1', webUrl: 'https://onedrive.example/item1' }),
          });
        const result = await adapter.executeWriteAction('token', 'MOVE_ONEDRIVE', {
          driveId: 'drive1',
          itemId: 'item1',
          targetParentFolderPath: '/Archive',
        });
        expect(result.success).toBe(true);
        const [, init] = (global.fetch as jest.Mock).mock.calls[1] as [string, RequestInit];
        expect(init.method).toBe('PATCH');
        expect(JSON.parse(init.body as string)).toEqual({
          parentReference: { id: 'target-folder-id' },
        });
      });

      it('fails when the target folder lookup 404s', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 404,
          text: async () => 'Not found',
        });
        const result = await adapter.executeWriteAction('token', 'MOVE_ONEDRIVE', {
          driveId: 'drive1',
          itemId: 'item1',
          targetParentFolderPath: '/Missing',
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('404');
      });
    });

    it('returns success:false for an unsupported action type', async () => {
      const result = await adapter.executeWriteAction('token', 'DELETE_ONEDRIVE', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('not supported');
    });

    it('catches a thrown error from the dispatched handler', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
      const result = await adapter.executeWriteAction('token', 'UPLOAD_ONEDRIVE', {
        driveId: 'drive1',
        parentFolderPath: '/Docs',
        fileName: 'x.txt',
        contentBase64: Buffer.from('x').toString('base64'),
      });
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('network down');
    });
  });

  describe('supportsWrite / getSupportedActionTypes', () => {
    it('supports write actions', () => {
      expect(adapter.supportsWrite()).toBe(true);
    });

    it('lists UPLOAD_ONEDRIVE and MOVE_ONEDRIVE', () => {
      expect(adapter.getSupportedActionTypes()).toEqual(
        expect.arrayContaining(['UPLOAD_ONEDRIVE', 'MOVE_ONEDRIVE']),
      );
    });
  });
});
