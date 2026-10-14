import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatSurface } from '../../../../common/enums/chat-surface.enum';
import { PluginConsentState } from '../../enums/plugin-consent-state.enum';
import { PluginInvokeStatus } from '../../enums/plugin-invoke-status.enum';
import { PluginConsentClient } from '../plugin-consent.client';
import { PluginInvokeClient } from '../plugin-invoke.client';

const { httpRequest } = vi.hoisted(() => ({ httpRequest: vi.fn() }));

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service t'),
  httpRequest,
}));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ PLUGIN_SERVICE_URL: 'https://plugin-service:4021' }) },
}));

const REQUEST = '33333333-3333-4333-8333-333333333333';
const INSTALL = '11111111-1111-4111-8111-111111111111';

describe('PluginConsentClient', () => {
  beforeEach(() => {
    httpRequest.mockReset();
  });

  it('waits on the internal route with the service credential and the owner id', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: { status: 'APPROVED' } });
    const state = await new PluginConsentClient().wait({
      userId: 'user-1',
      requestId: REQUEST,
      waitMs: 20_000,
    });
    expect(state).toBe(PluginConsentState.APPROVED);
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `https://plugin-service:4021/api/v1/internal/plugins/consent-requests/${REQUEST}/wait`,
        method: 'POST',
        headers: { Authorization: 'Service t' },
        body: { userId: 'user-1', waitMs: 20_000 },
        timeoutMs: 25_000,
      }),
    );
  });

  it('throws when the answer is not usable, so the loop denies the call', async () => {
    httpRequest.mockResolvedValue({ ok: false, status: 404, data: { errorCode: 'X' } });
    await expect(
      new PluginConsentClient().wait({ userId: 'user-1', requestId: REQUEST, waitMs: 1 }),
    ).rejects.toThrow('plugin consent wait failed');
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: { status: 'WHATEVER' } });
    await expect(
      new PluginConsentClient().wait({ userId: 'user-1', requestId: REQUEST, waitMs: 1 }),
    ).rejects.toThrow();
  });
});

describe('PluginInvokeClient consent card contract', () => {
  beforeEach(() => {
    httpRequest.mockReset();
  });

  const request = {
    userId: 'user-1',
    installId: INSTALL,
    toolName: 'send',
    args: { to: 'a@b.c' },
    conversationId: 'thread-1',
    surface: ChatSurface.CHAT,
    tainted: false,
  };

  it('parses the consent block and the call id of a CONSENT_REQUIRED answer', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        status: 'CONSENT_REQUIRED',
        callId: 'chat-abc-123456',
        content: null,
        errorCode: null,
        consent: {
          reason: 'REQUIRED_FIRST_USE',
          argsHash: 'h',
          argsPreview: '{"to":"a@b.c"}',
          requestId: REQUEST,
          expiresAt: '2026-10-15T10:02:00.000Z',
          options: { allowChat: true, always: true, alwaysNeedsConfirmation: false },
        },
      },
    });
    const result = await new PluginInvokeClient().invoke(request);
    expect(result.status).toBe(PluginInvokeStatus.CONSENT_REQUIRED);
    expect(result.callId).toBe('chat-abc-123456');
    expect(result.consent).toMatchObject({ requestId: REQUEST, argsPreview: '{"to":"a@b.c"}' });
  });

  it('an older plugin-service without a request id yields no card', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        status: 'CONSENT_REQUIRED',
        callId: 'chat-abc-123456',
        consent: { reason: 'R', argsHash: 'h', argsPreview: '{}' },
      },
    });
    const result = await new PluginInvokeClient().invoke(request);
    expect(result.consent).toBeUndefined();
  });

  it('a resume reuses the call id and names the approved request', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: { status: 'OK', content: 'x' } });
    await new PluginInvokeClient().invoke({
      ...request,
      callId: 'chat-abc-123456',
      consentRequestId: REQUEST,
    });
    const body = httpRequest.mock.calls[0]?.[0].body as Record<string, unknown>;
    expect(body['callId']).toBe('chat-abc-123456');
    expect(body['consentRequestId']).toBe(REQUEST);
  });

  it('a first call mints a fresh call id and sends no request id', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: { status: 'OK', content: 'x' } });
    await new PluginInvokeClient().invoke(request);
    const body = httpRequest.mock.calls[0]?.[0].body as Record<string, unknown>;
    expect(String(body['callId'])).toMatch(/^chat-/);
    expect(body).not.toHaveProperty('consentRequestId');
  });
});
