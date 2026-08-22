import { OutlookCalendarAdapter } from '../outlook-calendar.adapter';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import type { WorkspaceAdapter } from '../workspace-adapter.interface';

global.fetch = jest.fn();

describe('OutlookCalendarAdapter', () => {
  let adapter: OutlookCalendarAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new OutlookCalendarAdapter();
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

    // syncObjects() ignores the incoming deltaToken (underscore-prefixed,
    // unused) and deltaTokenOut is Graph's pagination @odata.nextLink,
    // never threaded back in on the next call — honestly false already,
    // confirmed during Phase 18's delta-sync investigation.
    it('does not support delta sync or webhooks', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsDeltaSync).toBe(false);
      expect(caps.supportsWebhooks).toBe(false);
    });

    it('includes MEETING in object types', () => {
      expect(adapter.getCapabilities().objectTypes).toEqual(['MEETING']);
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
          scope: 'Calendars.Read',
        }),
      });
      const tokens = await adapter.exchangeCodeForTokens('code', 'https://cb', 'verifier', {
        clientId: 'id',
        clientSecret: 'secret',
      });
      expect(tokens.accessToken).toBe('at');
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
    const event = (overrides: Record<string, unknown> = {}) => ({
      id: 'evt1',
      subject: 'Standup',
      bodyPreview: 'Daily sync',
      webLink: 'https://outlook.office.com/evt1',
      start: { dateTime: '2026-01-01T09:00:00', timeZone: 'UTC' },
      end: { dateTime: '2026-01-01T09:15:00', timeZone: 'UTC' },
      organizer: { emailAddress: { address: 'alice@example.com' } },
      isCancelled: false,
      createdDateTime: '2025-12-01T00:00:00Z',
      lastModifiedDateTime: '2025-12-02T00:00:00Z',
      ...overrides,
    });

    it('maps events to SyncedObject and filters out cancelled ones', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [event(), event({ id: 'evt2', isCancelled: true })] }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.objectsFound).toBe(2);
      expect(result.objectsSynced).toBe(1);
      expect(result.objects[0]?.externalId).toBe('evt1');
    });

    it('falls back to "(no title)" when subject is absent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [event({ subject: undefined })] }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.objects[0]?.title).toBe('(no title)');
    });

    it('ignores the incoming deltaToken', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [] }),
      });
      await adapter.syncObjects('token', 'some-stale-cursor');
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).not.toContain('some-stale-cursor');
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
    it('MEETING — resolves by externalId', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'evt1',
          subject: 'Standup',
          organizer: { emailAddress: { address: 'alice@example.com' } },
        }),
      });
      const live = await adapter.fetchObjectDetails('token', 'evt1', 'MEETING');
      expect(live?.title).toBe('Standup');
      expect(live?.authorId).toBe('alice@example.com');
    });

    it('returns null for a non-MEETING object type', async () => {
      const live = await adapter.fetchObjectDetails('token', 'evt1', 'DOCUMENT');
      expect(live).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const live = await adapter.fetchObjectDetails('token', 'missing', 'MEETING');
      expect(live).toBeNull();
    });

    it('throws on a non-404 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      await expect(adapter.fetchObjectDetails('token', 'evt1', 'MEETING')).rejects.toThrow(
        /HTTP 500/,
      );
    });
  });

  describe('no write path', () => {
    it('does not implement supportsWrite/executeWriteAction — read-only provider', () => {
      const asInterface: WorkspaceAdapter = adapter;
      expect(asInterface.supportsWrite).toBeUndefined();
      expect(asInterface.executeWriteAction).toBeUndefined();
    });
  });
});
