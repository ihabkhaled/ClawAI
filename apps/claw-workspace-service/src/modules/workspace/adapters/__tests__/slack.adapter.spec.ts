import { SlackAdapter } from '../slack.adapter';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';

global.fetch = jest.fn();

describe('SlackAdapter', () => {
  let adapter: SlackAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new SlackAdapter();
  });

  describe('healthCheck', () => {
    it('returns CONNECTED when auth.test reports ok:true', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ json: async () => ({ ok: true }) });
      const result = await adapter.healthCheck('token-abc');
      expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
    });

    it('returns DISCONNECTED on invalid_auth', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ ok: false, error: 'invalid_auth' }),
      });
      const result = await adapter.healthCheck('bad-token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
      expect(result.errorMessage).toBe('invalid_auth');
    });

    it('returns DISCONNECTED on token_revoked', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ ok: false, error: 'token_revoked' }),
      });
      const result = await adapter.healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
    });

    it('returns DEGRADED on any other Slack error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ ok: false, error: 'rate_limited' }),
      });
      const result = await adapter.healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DEGRADED);
      expect(result.errorMessage).toBe('rate_limited');
    });

    it('returns DISCONNECTED on network error', async () => {
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

    it('supports webhooks but not delta sync', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsWebhooks).toBe(true);
      expect(caps.supportsDeltaSync).toBe(false);
    });

    it('includes CHANNEL, MESSAGE, USER in object types', () => {
      expect(adapter.getCapabilities().objectTypes).toEqual(['CHANNEL', 'MESSAGE', 'USER']);
    });
  });

  describe('getDefaultScopes', () => {
    it('returns a non-empty array', () => {
      expect(adapter.getDefaultScopes().length).toBeGreaterThan(0);
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('exchanges a code for a bot access token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({
          ok: true,
          access_token: 'xoxb-abc',
          scope: 'channels:read,users:read',
        }),
      });
      const tokens = await adapter.exchangeCodeForTokens('code', 'https://cb', undefined, {
        clientId: 'id',
        clientSecret: 'secret',
      });
      expect(tokens.accessToken).toBe('xoxb-abc');
      expect(tokens.scopes).toEqual(['channels:read', 'users:read']);
    });

    it('falls back to authed_user.access_token when bot token is absent', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ ok: true, authed_user: { access_token: 'xoxp-user' } }),
      });
      const tokens = await adapter.exchangeCodeForTokens('code', 'https://cb', undefined, {
        clientId: 'id',
        clientSecret: 'secret',
      });
      expect(tokens.accessToken).toBe('xoxp-user');
    });

    it('throws when app credentials are missing', async () => {
      await expect(
        adapter.exchangeCodeForTokens('code', 'https://cb', undefined, {}),
      ).rejects.toThrow(/clientId and clientSecret/);
    });

    it('throws when Slack reports ok:false', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ ok: false, error: 'invalid_code' }),
      });
      await expect(
        adapter.exchangeCodeForTokens('code', 'https://cb', undefined, {
          clientId: 'id',
          clientSecret: 'secret',
        }),
      ).rejects.toThrow(/invalid_code/);
    });
  });

  describe('refreshTokens', () => {
    it('always throws — Slack does not support refresh_token flow', async () => {
      await expect(adapter.refreshTokens('rt', {})).rejects.toThrow(
        /does not support token refresh/,
      );
    });
  });

  describe('syncObjects', () => {
    it('maps public/private channels to SyncedObject', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({
          ok: true,
          channels: [
            { id: 'C1', name: 'general', purpose: { value: 'Team chat' }, created: 1700000000 },
          ],
        }),
      });
      const result = await adapter.syncObjects('token');
      expect(result.objects).toEqual([
        expect.objectContaining({
          externalId: 'C1',
          type: 'CHANNEL',
          title: '#general',
          content: 'Team chat',
        }),
      ]);
    });

    it('returns an empty list when Slack reports no channels', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ json: async () => ({ ok: true }) });
      const result = await adapter.syncObjects('token');
      expect(result.objects).toEqual([]);
    });

    it('throws when Slack reports ok:false', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ ok: false, error: 'missing_scope' }),
      });
      await expect(adapter.syncObjects('token')).rejects.toThrow(/missing_scope/);
    });
  });

  describe('write actions', () => {
    describe.each(['SEND_SLACK', 'SEND_SLACK_MESSAGE'])('%s', (actionType) => {
      it('posts channel+text to chat.postMessage', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => ({ ok: true, ts: '1700000000.000100' }),
        });
        const result = await adapter.executeWriteAction('token', actionType, {
          channel: 'C1',
          text: 'Hello',
        });
        expect(result).toEqual({ success: true, externalId: '1700000000.000100' });
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/chat.postMessage');
        expect(JSON.parse(init.body as string)).toEqual({ channel: 'C1', text: 'Hello' });
      });
    });

    it('REPLY_SLACK includes thread_ts when threadTs is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ ok: true, ts: '2.000' }),
      });
      await adapter.executeWriteAction('token', 'REPLY_SLACK', {
        channel: 'C1',
        text: 'Reply',
        threadTs: '1.000',
      });
      const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({
        channel: 'C1',
        text: 'Reply',
        thread_ts: '1.000',
      });
    });

    it('includes blocks when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ ok: true, ts: '3.000' }),
      });
      const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'hi' } }];
      await adapter.executeWriteAction('token', 'SEND_SLACK', {
        channel: 'C1',
        text: 'x',
        blocks,
      });
      const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string).blocks).toEqual(blocks);
    });

    it('returns success:false with the Slack error on ok:false', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ ok: false, error: 'channel_not_found' }),
      });
      const result = await adapter.executeWriteAction('token', 'SEND_SLACK', {
        channel: 'bad',
        text: 'x',
      });
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('channel_not_found');
    });

    it('returns success:false for an unsupported action type', async () => {
      const result = await adapter.executeWriteAction('token', 'DELETE_SLACK_MESSAGE', {});
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('unsupported action type');
    });
  });

  describe('supportsWrite / getSupportedActionTypes', () => {
    it('supports write actions', () => {
      expect(adapter.supportsWrite()).toBe(true);
    });

    it('lists the 3 supported action types', () => {
      expect(adapter.getSupportedActionTypes()).toEqual(
        expect.arrayContaining(['SEND_SLACK', 'SEND_SLACK_MESSAGE', 'REPLY_SLACK']),
      );
    });
  });
});
