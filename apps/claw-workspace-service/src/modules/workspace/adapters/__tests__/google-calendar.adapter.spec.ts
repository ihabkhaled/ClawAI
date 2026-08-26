import { GoogleCalendarAdapter } from '../google-calendar.adapter';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';

global.fetch = jest.fn();

describe('GoogleCalendarAdapter', () => {
  let adapter: GoogleCalendarAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new GoogleCalendarAdapter();
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

    // Unlike Drive's pageToken reuse, this really is the Calendar API's own
    // native incremental-sync mechanism (syncToken / nextSyncToken).
    it('supports delta sync via syncToken but not webhooks', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsDeltaSync).toBe(true);
      expect(caps.supportsWebhooks).toBe(false);
    });

    it('includes MEETING in object types', () => {
      expect(adapter.getCapabilities().objectTypes).toEqual(['MEETING']);
    });
  });

  describe('getDefaultScopes / getExtraAuthParams', () => {
    it('returns a non-empty scopes array', () => {
      expect(adapter.getDefaultScopes().length).toBeGreaterThan(0);
    });

    it('requests offline access with consent prompt', () => {
      expect(adapter.getExtraAuthParams()).toEqual({ access_type: 'offline', prompt: 'consent' });
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
          scope: 'calendar.readonly',
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
      summary: 'Standup',
      description: 'Daily sync',
      status: 'confirmed',
      htmlLink: 'https://calendar.google.com/evt1',
      start: { dateTime: '2026-01-01T09:00:00Z' },
      end: { dateTime: '2026-01-01T09:15:00Z' },
      organizer: { email: 'alice@example.com' },
      created: '2025-12-01T00:00:00Z',
      updated: '2025-12-02T00:00:00Z',
      ...overrides,
    });

    it('maps events to SyncedObject and filters out cancelled ones', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ items: [event(), event({ id: 'evt2', status: 'cancelled' })] }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.objectsFound).toBe(2);
      expect(result.objectsSynced).toBe(1);
      expect(result.objects[0]?.externalId).toBe('evt1');
    });

    it('falls back to "(no title)" when summary is absent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ items: [event({ summary: undefined })] }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.objects[0]?.title).toBe('(no title)');
    });

    it('threads the incoming deltaToken through as syncToken', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      });
      await adapter.syncObjects('token', 'prior-sync-token');
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain('syncToken=prior-sync-token');
    });

    it('returns nextSyncToken as deltaTokenOut when present', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ items: [], nextSyncToken: 'next-sync' }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.deltaTokenOut).toBe('next-sync');
    });

    it('falls back to nextPageToken when nextSyncToken is absent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ items: [], nextPageToken: 'next-page' }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.deltaTokenOut).toBe('next-page');
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
          summary: 'Standup',
          organizer: { email: 'alice@example.com' },
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

  // Post-pack hardening — previously read-only; now supports one write
  // action (create an event) via events.insert.
  describe('write actions', () => {
    it('supports write actions and lists CREATE_GOOGLE_CALENDAR_EVENT', () => {
      expect(adapter.supportsWrite()).toBe(true);
      expect(adapter.getSupportedActionTypes()).toEqual(['CREATE_GOOGLE_CALENDAR_EVENT']);
    });

    describe('CREATE_GOOGLE_CALENDAR_EVENT', () => {
      it('creates an event and returns its id/link', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ id: 'new-evt', htmlLink: 'https://calendar.google.com/new-evt' }),
        });
        const result = await adapter.executeWriteAction('token', 'CREATE_GOOGLE_CALENDAR_EVENT', {
          summary: 'Planning',
          startDateTime: '2026-02-01T10:00:00',
          endDateTime: '2026-02-01T10:30:00',
          attendeeEmails: ['bob@example.com'],
        });
        expect(result).toEqual({
          success: true,
          externalId: 'new-evt',
          url: 'https://calendar.google.com/new-evt',
        });
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/calendars/primary/events');
        const body = JSON.parse(init.body as string);
        expect(body.attendees).toEqual([{ email: 'bob@example.com' }]);
      });

      it('returns success:false when required fields are missing', async () => {
        const result = await adapter.executeWriteAction('token', 'CREATE_GOOGLE_CALENDAR_EVENT', {
          summary: 'x',
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('requires {summary, startDateTime, endDateTime}');
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('returns success:false on a non-ok API response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: 403,
          text: async () => 'forbidden',
        });
        const result = await adapter.executeWriteAction('token', 'CREATE_GOOGLE_CALENDAR_EVENT', {
          summary: 'x',
          startDateTime: '2026-02-01T10:00:00',
          endDateTime: '2026-02-01T10:30:00',
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toContain('403');
      });

      it('catches a thrown network error', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
        const result = await adapter.executeWriteAction('token', 'CREATE_GOOGLE_CALENDAR_EVENT', {
          summary: 'x',
          startDateTime: '2026-02-01T10:00:00',
          endDateTime: '2026-02-01T10:30:00',
        });
        expect(result.success).toBe(false);
        expect(result.errorMessage).toBe('network down');
      });
    });

    it('returns success:false for an unsupported action type', async () => {
      const result = await adapter.executeWriteAction('token', 'DELETE_GOOGLE_CALENDAR_EVENT', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('unsupported action type');
    });
  });
});
