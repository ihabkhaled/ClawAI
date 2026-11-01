import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaKind } from '../../enums/media-kind.enum';
import {
  awaitMedia,
  cancelMedia,
  linkMedia,
  readMedia,
  startMedia,
} from '../media-gateway.utility';

const http = vi.hoisted(() => ({ httpRequest: vi.fn() }));
vi.mock('../../../../common/utilities', () => ({
  httpRequest: http.httpRequest,
  buildInterServiceAuthHeader: () => 'Bearer test',
}));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ IMAGE_SERVICE_URL: 'http://image-service:4005' }) },
}));

const noSleep = (): Promise<void> => Promise.resolve();
const ok = (data: unknown) => ({ ok: true, status: 200, data });

describe('startMedia', () => {
  beforeEach(() => http.httpRequest.mockReset());

  it('posts each kind to its own internal route and returns the id', async () => {
    http.httpRequest.mockResolvedValue(
      ok({ generationId: 'g1', provider: 'IMAGE_GEMINI', model: 'm' }),
    );
    const out = await startMedia({
      kind: MediaKind.IMAGE,
      userId: 'u',
      prompt: 'p',
      provider: 'IMAGE_GEMINI',
      model: 'm',
    });
    expect(out).toEqual({ ok: true, id: 'g1', provider: 'IMAGE_GEMINI', model: 'm' });
    expect(http.httpRequest.mock.calls[0]?.[0].url).toBe(
      'http://image-service:4005/api/v1/internal/images/generate',
    );

    http.httpRequest.mockResolvedValue(ok({ id: 'a1', status: 'QUEUED' }));
    await startMedia({
      kind: MediaKind.AUDIO,
      userId: 'u',
      prompt: 'hi',
      provider: 'AUDIO_OPENAI',
      audioKind: 'SPEECH',
      voice: 'alloy',
    });
    const audio = http.httpRequest.mock.calls[1]?.[0];
    expect(audio.url).toBe('http://image-service:4005/api/v1/internal/audio/generate');
    expect(audio.body).toMatchObject({
      kind: 'SPEECH',
      voice: 'alloy',
      provider: 'AUDIO_OPENAI',
      userId: 'u',
    });

    http.httpRequest.mockResolvedValue(ok({ generationId: 'v1' }));
    await startMedia({
      kind: MediaKind.VIDEO,
      userId: 'u',
      prompt: 'p',
      provider: 'VIDEO_GEMINI',
      model: 'm',
      durationSeconds: 6,
      aspectRatio: '9:16',
    });
    expect(http.httpRequest.mock.calls[2]?.[0].url).toContain('/internal/videos/generate');
    expect(http.httpRequest.mock.calls[2]?.[0].body).toMatchObject({
      durationSeconds: 6,
      aspectRatio: '9:16',
    });
  });

  it('reports a plan refusal, missing credit, a rejection and an outage as outcomes', async () => {
    const request = {
      kind: MediaKind.IMAGE,
      userId: 'u',
      prompt: 'p',
      provider: 'IMAGE_GEMINI',
    } as const;
    http.httpRequest.mockResolvedValue({
      ok: false,
      status: 403,
      data: { code: 'PLAN_FEATURE_DISABLED' },
    });
    expect(await startMedia(request)).toMatchObject({ ok: false, reason: 'PLAN' });
    http.httpRequest.mockResolvedValue({ ok: false, status: 402, data: {} });
    expect(await startMedia(request)).toMatchObject({ ok: false, reason: 'PAYMENT' });
    http.httpRequest.mockResolvedValue({ ok: false, status: 422, data: {} });
    expect(await startMedia(request)).toMatchObject({ ok: false, reason: 'REJECTED' });
    http.httpRequest.mockResolvedValue({ ok: false, status: 502, data: {} });
    expect(await startMedia(request)).toMatchObject({ ok: false, reason: 'UNAVAILABLE' });
  });
});

describe('readMedia', () => {
  beforeEach(() => http.httpRequest.mockReset());

  it('reads the asset of an image row, a video view and an audio row', async () => {
    http.httpRequest.mockResolvedValueOnce(
      ok({ id: 'i', status: 'COMPLETED', assets: [{ url: '/i.png', mimeType: 'image/png' }] }),
    );
    expect(await readMedia(MediaKind.IMAGE, 'i')).toMatchObject({
      assetUrl: '/i.png',
      mimeType: 'image/png',
    });
    http.httpRequest.mockResolvedValueOnce(
      ok({ id: 'v', status: 'COMPLETED', asset: { url: '/v.mp4', mimeType: 'video/mp4' } }),
    );
    expect(await readMedia(MediaKind.VIDEO, 'v')).toMatchObject({ mimeType: 'video/mp4' });
    http.httpRequest.mockResolvedValueOnce(
      ok({
        id: 'a',
        status: 'COMPLETED',
        assetUrl: '/a.mp3',
        mimeType: 'audio/mpeg',
        durationSec: 3.5,
      }),
    );
    expect(await readMedia(MediaKind.AUDIO, 'a')).toMatchObject({
      durationSec: 3.5,
      assetUrl: '/a.mp3',
    });
  });
});

describe('awaitMedia', () => {
  beforeEach(() => http.httpRequest.mockReset());
  const options = { pollMs: 1, maxPolls: 5, sleep: noSleep };

  it('completes once the status is terminal', async () => {
    http.httpRequest
      .mockResolvedValueOnce(ok({ id: 'g', status: 'GENERATING' }))
      .mockResolvedValueOnce(ok({ id: 'g', status: 'COMPLETED' }));
    expect(await awaitMedia(MediaKind.IMAGE, 'g', options)).toMatchObject({ state: 'completed' });
    expect(http.httpRequest).toHaveBeenCalledTimes(2);
  });

  it('is bounded: never polls more than maxPolls', async () => {
    http.httpRequest.mockResolvedValue(ok({ id: 'g', status: 'GENERATING' }));
    expect(await awaitMedia(MediaKind.VIDEO, 'g', options)).toMatchObject({ state: 'timeout' });
    expect(http.httpRequest).toHaveBeenCalledTimes(5);
  });

  it('gives up after three unreadable polls in a row', async () => {
    http.httpRequest.mockResolvedValue({ ok: false, status: 500, data: {} });
    expect(await awaitMedia(MediaKind.IMAGE, 'g', options)).toMatchObject({ state: 'timeout' });
    expect(http.httpRequest).toHaveBeenCalledTimes(3);
  });

  it('follows the fallback generation that replaced a failed one', async () => {
    http.httpRequest
      .mockResolvedValueOnce(ok({ id: 'g', status: 'FAILED', supersededById: 'g2' }))
      .mockResolvedValueOnce(ok({ id: 'g2', status: 'COMPLETED' }));
    expect(await awaitMedia(MediaKind.IMAGE, 'g', options)).toMatchObject({ state: 'completed' });
    expect(http.httpRequest.mock.calls[1]?.[0].url).toContain('/g2');
  });

  it('reports a failure and a cancelled row', async () => {
    http.httpRequest.mockResolvedValueOnce(ok({ id: 'g', status: 'FAILED', errorCode: 'X' }));
    expect(await awaitMedia(MediaKind.IMAGE, 'g', options)).toMatchObject({ state: 'failed' });
    http.httpRequest.mockResolvedValueOnce(ok({ id: 'g', status: 'CANCELLED' }));
    expect(await awaitMedia(MediaKind.IMAGE, 'g', options)).toMatchObject({ state: 'cancelled' });
  });

  it('stops at once when the signal aborts', async () => {
    const controller = new AbortController();
    controller.abort();
    expect(
      await awaitMedia(MediaKind.IMAGE, 'g', { ...options, signal: controller.signal }),
    ).toMatchObject({ state: 'cancelled' });
    expect(http.httpRequest).not.toHaveBeenCalled();
  });
});

describe('cancelMedia, linkMedia and the audio turn id', () => {
  beforeEach(() => http.httpRequest.mockReset());

  it('cancels a generation at its own service route', async () => {
    http.httpRequest.mockResolvedValue(ok({ cancelled: true }));
    expect(await cancelMedia(MediaKind.VIDEO, 'v1', 'u')).toBe(true);
    expect(http.httpRequest.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      body: { userId: 'u' },
      url: 'http://image-service:4005/api/v1/internal/videos/v1/cancel',
    });
    http.httpRequest.mockResolvedValue({ ok: false, status: 404, data: {} });
    expect(await cancelMedia(MediaKind.AUDIO, 'a1', 'u')).toBe(false);
  });

  it('links video and audio rows to the assistant message', async () => {
    http.httpRequest.mockResolvedValue(ok({ linked: 1 }));
    expect(await linkMedia(MediaKind.VIDEO, 'v1', 'u', 'm1')).toBe(true);
    expect(http.httpRequest.mock.calls[0]?.[0]).toMatchObject({
      url: 'http://image-service:4005/api/v1/internal/videos/v1/assistant-message',
      body: { userId: 'u', assistantMessageId: 'm1' },
    });
    expect(await linkMedia(MediaKind.AUDIO, 'a1', 'u', 'm1')).toBe(true);
    expect(http.httpRequest.mock.calls[1]?.[0].url).toContain(
      '/internal/audio/a1/assistant-message',
    );
  });

  it('sends the turn to the audio service as messageId', async () => {
    http.httpRequest.mockResolvedValue(ok({ id: 'a1' }));
    await startMedia({
      kind: MediaKind.AUDIO,
      userId: 'u',
      prompt: 'hi',
      provider: 'AUDIO_OPENAI',
      threadId: 't1',
      userMessageId: 'um1',
    });
    const body = http.httpRequest.mock.calls[0]?.[0].body;
    expect(body).toMatchObject({ threadId: 't1', messageId: 'um1' });
    expect(body).not.toHaveProperty('userMessageId');
  });
});
