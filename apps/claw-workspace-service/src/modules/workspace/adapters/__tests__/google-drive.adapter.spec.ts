import { GoogleDriveAdapter } from '../google-drive.adapter';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';

global.fetch = jest.fn();

describe('GoogleDriveAdapter', () => {
  let adapter: GoogleDriveAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new GoogleDriveAdapter();
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
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'unavailable',
      });
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

    it('does not support webhooks', () => {
      expect(adapter.getCapabilities().supportsWebhooks).toBe(false);
    });

    it('includes FILE and DOCUMENT in object types', () => {
      expect(adapter.getCapabilities().objectTypes).toEqual(['FILE', 'DOCUMENT']);
    });
  });

  describe('getDefaultScopes / getExtraAuthParams', () => {
    it('returns a non-empty scopes array', () => {
      expect(adapter.getDefaultScopes().length).toBeGreaterThan(0);
    });

    it('requests offline access with consent prompt', () => {
      expect(adapter.getExtraAuthParams()).toEqual({
        access_type: 'offline',
        prompt: 'consent',
      });
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
          scope: 'drive.readonly drive.file',
        }),
      });
      const tokens = await adapter.exchangeCodeForTokens('code', 'https://cb', 'verifier', {
        clientId: 'id',
        clientSecret: 'secret',
      });
      expect(tokens.accessToken).toBe('at');
      expect(tokens.scopes).toEqual(['drive.readonly', 'drive.file']);
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
      expect(tokens.refreshToken).toBe('rt');
    });

    it('throws when app credentials are missing', async () => {
      await expect(adapter.refreshTokens('rt', {})).rejects.toThrow(/clientId and clientSecret/);
    });
  });

  describe('syncObjects', () => {
    const file = (overrides: Record<string, unknown> = {}) => ({
      id: 'file1',
      name: 'Q1 Report',
      mimeType: 'application/pdf',
      webViewLink: 'https://drive.google.com/file1',
      owners: [{ emailAddress: 'alice@example.com' }],
      createdTime: '2026-01-01T00:00:00Z',
      modifiedTime: '2026-01-02T00:00:00Z',
      ...overrides,
    });

    it('maps files to SyncedObject with resolved object type', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ files: [file()] }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.objects).toEqual([
        expect.objectContaining({
          externalId: 'file1',
          type: 'DOCUMENT',
          title: 'Q1 Report',
          authorId: 'alice@example.com',
        }),
      ]);
    });

    it('resolves spreadsheet mime type to SPREADSHEET', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          files: [file({ mimeType: 'application/vnd.google-apps.spreadsheet' })],
        }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.objects[0]?.type).toBe('SPREADSHEET');
    });

    it('resolves folder mime type to PROJECT', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ files: [file({ mimeType: 'application/vnd.google-apps.folder' })] }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.objects[0]?.type).toBe('PROJECT');
    });

    it('threads the incoming deltaToken through as pageToken', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ files: [] }),
      });
      await adapter.syncObjects('token', 'prior-page-token');
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain('pageToken=prior-page-token');
    });

    it('returns nextPageToken as deltaTokenOut when present', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ files: [], nextPageToken: 'next-token' }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.deltaTokenOut).toBe('next-token');
    });

    it('throws on a non-ok list response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'server error',
      });
      await expect(adapter.syncObjects('token')).rejects.toThrow(/HTTP 500/);
    });
  });

  describe('fetchObjectDetails', () => {
    it('resolves metadata and inlines exported text content for a Google Doc', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 'doc1',
            name: 'Notes',
            mimeType: 'application/vnd.google-apps.document',
            createdTime: '2026-01-01T00:00:00Z',
            modifiedTime: '2026-01-02T00:00:00Z',
          }),
        })
        .mockResolvedValueOnce({ ok: true, text: async () => 'exported plain text' });
      const live = await adapter.fetchObjectDetails('token', 'doc1', 'DOCUMENT');
      expect(live?.title).toBe('Notes');
      expect(live?.content).toBe('exported plain text');
    });

    it('returns null content when the file type has no export path', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'img1',
          name: 'photo.png',
          mimeType: 'image/png',
          createdTime: '2026-01-01T00:00:00Z',
          modifiedTime: '2026-01-02T00:00:00Z',
        }),
      });
      const live = await adapter.fetchObjectDetails('token', 'img1', 'FILE');
      expect(live?.content).toBeNull();
    });

    it('returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const live = await adapter.fetchObjectDetails('token', 'missing', 'FILE');
      expect(live).toBeNull();
    });

    it('throws on a non-404 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(adapter.fetchObjectDetails('token', 'file1', 'FILE')).rejects.toThrow(
        /HTTP 500/,
      );
    });
  });

  describe('downloadFileContent', () => {
    it('streams a binary file as-is via ?alt=media', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: {},
        headers: new Map([
          ['content-length', '100'],
          ['content-type', 'image/png'],
        ]),
      });
      const stream = await adapter.downloadFileContent('token', 'img1', { name: 'photo.png' });
      expect(stream?.filename).toBe('photo.png');
      expect(stream?.mimeType).toBe('image/png');
    });

    it('exports a Google Doc to PDF with the .pdf extension', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: {},
        headers: new Map(),
      });
      const stream = await adapter.downloadFileContent('token', 'doc1', {
        name: 'Notes',
        mimeType: 'application/vnd.google-apps.document',
      });
      expect(stream?.filename).toBe('Notes.pdf');
      expect(stream?.mimeType).toBe('application/pdf');
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain('/export?mimeType=');
    });

    it('returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const stream = await adapter.downloadFileContent('token', 'missing');
      expect(stream).toBeNull();
    });

    it('throws on a non-404 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, body: null });
      await expect(adapter.downloadFileContent('token', 'file1')).rejects.toThrow(/HTTP 500/);
    });
  });

  describe('write actions', () => {
    describe('UPLOAD_DRIVE', () => {
      it('multipart-uploads name+content and returns the created id/url', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ id: 'new-file', webViewLink: 'https://drive.google.com/new-file' }),
        });
        const result = await adapter.executeWriteAction('token', 'UPLOAD_DRIVE', {
          name: 'notes.txt',
          content: 'hello world',
        });
        expect(result).toEqual({
          success: true,
          externalId: 'new-file',
          url: 'https://drive.google.com/new-file',
        });
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toContain('uploadType=multipart');
        expect(init.method).toBe('POST');
      });

      it('returns success:false when name or content is missing', async () => {
        const result = await adapter.executeWriteAction('token', 'UPLOAD_DRIVE', { name: 'x' });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('requires {name, content}');
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('returns success:false on a non-ok upload response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 400 });
        const result = await adapter.executeWriteAction('token', 'UPLOAD_DRIVE', {
          name: 'x.txt',
          content: 'y',
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('400');
      });
    });

    describe('MOVE_DRIVE', () => {
      it('PATCHes addParents/removeParents as query params', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ id: 'file1', webViewLink: 'https://drive.google.com/file1' }),
        });
        const result = await adapter.executeWriteAction('token', 'MOVE_DRIVE', {
          fileId: 'file1',
          addParents: 'folderA',
          removeParents: 'folderB',
        });
        expect(result.success).toBe(true);
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toContain('addParents=folderA');
        expect(url).toContain('removeParents=folderB');
        expect(init.method).toBe('PATCH');
      });

      it('returns success:false on a non-ok move response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403 });
        const result = await adapter.executeWriteAction('token', 'MOVE_DRIVE', {
          fileId: 'file1',
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('403');
      });
    });

    it('returns success:false for an unsupported action type', async () => {
      const result = await adapter.executeWriteAction('token', 'DELETE_DRIVE', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('unsupported action type');
    });
  });

  describe('supportsWrite / getSupportedActionTypes', () => {
    it('supports write actions', () => {
      expect(adapter.supportsWrite()).toBe(true);
    });

    it('lists UPLOAD_DRIVE and MOVE_DRIVE', () => {
      expect(adapter.getSupportedActionTypes()).toEqual(
        expect.arrayContaining(['UPLOAD_DRIVE', 'MOVE_DRIVE']),
      );
    });
  });
});
