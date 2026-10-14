import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatSurface } from '../../../../common/enums/chat-surface.enum';
import { PluginInvokeStatus } from '../../enums/plugin-invoke-status.enum';
import { PluginNoticeCode } from '../../enums/plugin-notice-code.enum';
import { PluginInvokeClient } from '../plugin-invoke.client';

const { httpRequest } = vi.hoisted(() => ({ httpRequest: vi.fn() }));

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service t'),
  httpRequest,
}));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ PLUGIN_SERVICE_URL: 'https://plugin-service:4021' }) },
}));

const INSTALL = '11111111-1111-4111-8111-111111111111';

const goodTool = {
  nativeName: 'plugin_web-fetch_fetch_page',
  installId: INSTALL,
  pluginSlug: 'web-fetch',
  toolName: 'fetch_page',
  title: 'Fetch a page',
  description: 'Reads one page.',
  inputSchema: { type: 'object' },
  riskLevel: 'READ',
};

describe('PluginInvokeClient', () => {
  const client = new PluginInvokeClient();

  beforeEach(() => {
    httpRequest.mockReset();
  });

  describe('resolve', () => {
    const request = {
      userId: 'user-1',
      surface: ChatSurface.CHAT,
      refs: [{ installId: INSTALL, label: 'Web' }],
    };

    it('posts to the internal route with the service credential and the owner id', async () => {
      httpRequest.mockResolvedValue({ ok: true, status: 200, data: { tools: [goodTool] } });
      await client.resolve(request);
      expect(httpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://plugin-service:4021/api/v1/internal/plugins/resolve',
          method: 'POST',
          headers: { Authorization: 'Service t' },
          body: { ...request, surface: 'chat' },
        }),
      );
    });

    it('applies default limits and caps absurd ones', async () => {
      httpRequest.mockResolvedValue({ ok: true, status: 200, data: { tools: [goodTool] } });
      expect((await client.resolve(request)).limits).toMatchObject({
        maxRounds: 5,
        maxCallsPerTurn: 6,
      });
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { tools: [goodTool], limits: { maxRounds: 999, maxCallsPerTurn: 999 } },
      });
      expect((await client.resolve(request)).limits).toMatchObject({
        maxRounds: 10,
        maxCallsPerTurn: 20,
      });
    });

    it('keeps known notices and drops unknown codes', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          tools: [],
          notices: [{ code: 'PLUGIN_NO_TOOLS', pluginSlug: 'mail' }, { code: 'SOMETHING_ELSE' }],
        },
      });
      expect((await client.resolve(request)).notices).toEqual([
        { code: PluginNoticeCode.NO_TOOLS, pluginSlug: 'mail' },
      ]);
    });

    it('throws on a non-2xx answer so the loop can degrade to plain chat', async () => {
      httpRequest.mockResolvedValue({ ok: false, status: 503, data: {} });
      await expect(client.resolve(request)).rejects.toThrow('503');
    });

    it('throws on a malformed tool list rather than trusting it', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { tools: [{ ...goodTool, riskLevel: 'WHATEVER' }] },
      });
      await expect(client.resolve(request)).rejects.toThrow('malformed');
    });
  });

  describe('invoke', () => {
    const request = {
      userId: 'user-1',
      installId: INSTALL,
      toolName: 'fetch_page',
      args: { url: 'https://example.com' },
      conversationId: 'thread-1',
      surface: ChatSurface.CHAT,
      tainted: false,
    };

    it('returns the parsed status and content', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { status: 'OK', content: 'hello', truncated: true, durationMs: 40, untrusted: true },
      });
      expect(await client.invoke(request)).toEqual({
        status: PluginInvokeStatus.OK,
        content: 'hello',
        truncated: true,
        durationMs: 40,
      });
      expect(httpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://plugin-service:4021/api/v1/internal/plugins/invoke',
        }),
      );
    });

    it('sends the body plugin-service validates: lower-case surface, a minted callId, no empty ids', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { status: 'OK', content: 'x', truncated: false, durationMs: 1 },
      });
      await client.invoke({ ...request, conversationId: '', surface: ChatSurface.BEST_OF_N });
      const sent = httpRequest.mock.calls[0]?.[0] as { body: Record<string, unknown> };
      expect(sent.body).toMatchObject({
        userId: 'user-1',
        installId: INSTALL,
        toolName: 'fetch_page',
        surface: 'best_of_n',
        tainted: false,
      });
      expect(sent.body).not.toHaveProperty('conversationId');
      expect(sent.body).not.toHaveProperty('messageId');
      expect(String(sent.body['callId'])).toMatch(/^chat-[0-9a-f-]{36}$/);
    });

    it('mints a different callId for every attempt', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { status: 'OK', truncated: false, durationMs: 1 },
      });
      await client.invoke({ ...request, messageId: 'msg-1' });
      await client.invoke({ ...request, messageId: 'msg-1' });
      const [first, second] = httpRequest.mock.calls.map(
        (call) => (call[0] as { body: Record<string, unknown> }).body,
      );
      expect(first?.['callId']).not.toBe(second?.['callId']);
      expect(first?.['messageId']).toBe('msg-1');
    });

    it('accepts the explicit nulls and the TIMEOUT status plugin-service sends', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          status: 'TIMEOUT',
          content: null,
          errorCode: null,
          truncated: false,
          durationMs: 60_000,
          untrusted: true,
        },
      });
      expect(await client.invoke(request)).toEqual({
        status: PluginInvokeStatus.TIMEOUT,
        truncated: false,
        durationMs: 60_000,
      });
    });

    it('keeps the stable errorCode of an HTTP refusal (plan, duplicate, quota unavailable)', async () => {
      httpRequest.mockResolvedValue({
        ok: false,
        status: 403,
        data: { message: 'no', errorCode: 'PLUGIN_PLAN_DISABLED' },
      });
      expect(await client.invoke(request)).toMatchObject({
        status: PluginInvokeStatus.ERROR,
        errorCode: 'PLUGIN_PLAN_DISABLED',
      });
    });

    it('passes through the non-OK statuses the plugin service defines', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { status: 'CONSENT_REQUIRED', truncated: false, durationMs: 1 },
      });
      expect((await client.invoke(request)).status).toBe(PluginInvokeStatus.CONSENT_REQUIRED);
    });

    it('turns a status-less error body into an ERROR result with a stable code', async () => {
      httpRequest.mockResolvedValue({ ok: false, status: 500, data: { message: 'boom' } });
      expect(await client.invoke(request)).toMatchObject({
        status: PluginInvokeStatus.ERROR,
        errorCode: 'PLUGIN_SERVICE_ERROR',
      });
    });
  });
});
