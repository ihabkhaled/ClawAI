import { vi } from 'vitest';

import { VideoFailureCode } from '../../../../common/enums';
import { geminiVeoClient, xaiVideoClient } from '../../constants/video-provider-clients.constants';

const http = vi.hoisted(() => ({ httpGet: vi.fn(), httpPost: vi.fn() }));

vi.mock('@common/utilities', () => http);

const gemini = {
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: 'g-key',
};
const xai = { baseUrl: 'https://api.x.ai/v1/', apiKey: 'x-key' };
const request = {
  model: 'models/veo-3.1-fast-generate-preview',
  prompt: 'A lighthouse at dusk',
  durationSeconds: 6,
  aspectRatio: '9:16',
};

describe('Gemini Veo client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts a long-running job on the bare model, at 720p, with the key header', async () => {
    http.httpPost.mockResolvedValue({ name: 'models/veo/operations/op-1' });

    const operation = await geminiVeoClient.start(gemini, request);

    expect(operation).toBe('models/veo/operations/op-1');
    const [url, body, config] = http.httpPost.mock.calls[0] ?? [];
    // The OpenAI-compat suffix is not where Veo lives.
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning',
    );
    expect(body).toEqual({
      instances: [{ prompt: 'A lighthouse at dusk' }],
      parameters: { aspectRatio: '9:16', resolution: '720p', durationSeconds: 6 },
    });
    expect(config.headers).toEqual({ 'x-goog-api-key': 'g-key' });
  });

  it('sends the source image as image.bytesBase64Encoded for image-to-video', async () => {
    http.httpPost.mockResolvedValue({ name: 'models/veo/operations/op-2' });

    await geminiVeoClient.start(gemini, {
      ...request,
      sourceImage: { base64: 'QUJD', mimeType: 'image/png' },
    });

    const [, body] = http.httpPost.mock.calls[0] ?? [];
    expect(body.instances).toEqual([
      {
        prompt: 'A lighthouse at dusk',
        image: { bytesBase64Encoded: 'QUJD', mimeType: 'image/png' },
      },
    ]);
  });

  it('refuses a start that returns no operation name', async () => {
    http.httpPost.mockResolvedValue({});

    await expect(geminiVeoClient.start(gemini, request)).rejects.toMatchObject({
      code: VideoFailureCode.NO_VIDEO_RETURNED,
    });
  });

  it.each([
    [404, VideoFailureCode.MODEL_UNAVAILABLE],
    [429, VideoFailureCode.PROVIDER_QUOTA_EXCEEDED],
    [401, VideoFailureCode.PROVIDER_AUTH_FAILED],
    [503, VideoFailureCode.PROVIDER_UNAVAILABLE],
  ])('classifies a provider %d on start as %s', async (status, code) => {
    http.httpPost.mockRejectedValue({ response: { status, data: { error: { message: 'no' } } } });

    await expect(geminiVeoClient.start(gemini, request)).rejects.toMatchObject({ code });
  });

  it('polls: pending, then the video uri when done', async () => {
    http.httpGet.mockResolvedValueOnce({ done: false });
    http.httpGet.mockResolvedValueOnce({
      done: true,
      response: {
        generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://g/v.mp4' } }] },
      },
    });

    expect(await geminiVeoClient.poll(gemini, 'models/veo/operations/op-1')).toEqual({
      state: 'PENDING',
    });
    expect(await geminiVeoClient.poll(gemini, 'models/veo/operations/op-1')).toEqual({
      state: 'DONE',
      downloadUrl: 'https://g/v.mp4',
    });
    expect(http.httpGet.mock.calls[0]?.[0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/veo/operations/op-1',
    );
  });

  it('polls: a safety filter is a content rejection, an empty result is no video', async () => {
    http.httpGet.mockResolvedValueOnce({
      done: true,
      response: {
        generateVideoResponse: { raiMediaFilteredCount: 1, raiMediaFilteredReasons: ['blocked'] },
      },
    });
    http.httpGet.mockResolvedValueOnce({ done: true, response: {} });
    http.httpGet.mockResolvedValueOnce({ done: true, error: { message: 'Blocked by safety' } });

    expect(await geminiVeoClient.poll(gemini, 'op')).toMatchObject({
      state: 'FAILED',
      code: VideoFailureCode.CONTENT_REJECTED,
    });
    expect(await geminiVeoClient.poll(gemini, 'op')).toMatchObject({
      state: 'FAILED',
      code: VideoFailureCode.NO_VIDEO_RETURNED,
    });
    expect(await geminiVeoClient.poll(gemini, 'op')).toMatchObject({
      state: 'FAILED',
      code: VideoFailureCode.CONTENT_REJECTED,
    });
  });

  it('downloads the bytes with the key header', async () => {
    http.httpGet.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);

    const bytes = await geminiVeoClient.download(gemini, 'https://g/v.mp4');

    expect([...bytes]).toEqual([1, 2, 3]);
    expect(http.httpGet.mock.calls[0]?.[1]).toMatchObject({
      headers: { 'x-goog-api-key': 'g-key' },
      responseType: 'arraybuffer',
    });
  });
});

describe('xAI video client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts a job and returns the request id', async () => {
    http.httpPost.mockResolvedValue({ request_id: 'req-1' });

    const id = await xaiVideoClient.start(xai, { ...request, model: 'grok-imagine-video' });

    expect(id).toBe('req-1');
    const [url, body, config] = http.httpPost.mock.calls[0] ?? [];
    expect(url).toBe('https://api.x.ai/v1/videos/generations');
    expect(body).toEqual({
      model: 'grok-imagine-video',
      prompt: 'A lighthouse at dusk',
      duration: 6,
      aspect_ratio: '9:16',
      resolution: '720p',
    });
    expect(config.headers).toEqual({ Authorization: 'Bearer x-key' });
  });

  it('sends the source image as a data URI under image.url for image-to-video', async () => {
    http.httpPost.mockResolvedValue({ request_id: 'req-2' });

    await xaiVideoClient.start(xai, {
      ...request,
      model: 'grok-imagine-video',
      sourceImage: { base64: 'QUJD', mimeType: 'image/jpeg' },
    });

    const [, body] = http.httpPost.mock.calls[0] ?? [];
    expect(body.image).toEqual({ url: 'data:image/jpeg;base64,QUJD' });
    expect(body.prompt).toBe('A lighthouse at dusk');
  });

  it('polls pending, done (with the reported length), failed and expired', async () => {
    http.httpGet.mockResolvedValueOnce({ status: 'pending' });
    http.httpGet.mockResolvedValueOnce({
      status: 'done',
      video: { url: 'https://vidgen.x.ai/a.mp4', duration: 5.2 },
    });
    http.httpGet.mockResolvedValueOnce({ status: 'failed', error: 'content moderation blocked' });
    http.httpGet.mockResolvedValueOnce({ status: 'expired' });

    expect(await xaiVideoClient.poll(xai, 'req-1')).toEqual({ state: 'PENDING' });
    expect(await xaiVideoClient.poll(xai, 'req-1')).toEqual({
      state: 'DONE',
      downloadUrl: 'https://vidgen.x.ai/a.mp4',
      durationSeconds: 6,
    });
    expect(await xaiVideoClient.poll(xai, 'req-1')).toMatchObject({
      state: 'FAILED',
      code: VideoFailureCode.CONTENT_REJECTED,
    });
    expect(await xaiVideoClient.poll(xai, 'req-1')).toMatchObject({
      state: 'FAILED',
      code: VideoFailureCode.PROVIDER_FAILURE,
    });
    expect(http.httpGet.mock.calls[0]?.[0]).toBe('https://api.x.ai/v1/videos/req-1');
  });

  it('treats done without a url as no video', async () => {
    http.httpGet.mockResolvedValue({ status: 'done' });

    expect(await xaiVideoClient.poll(xai, 'req-1')).toMatchObject({
      state: 'FAILED',
      code: VideoFailureCode.NO_VIDEO_RETURNED,
    });
  });

  it('downloads from a public provider host and refuses a private one', async () => {
    http.httpGet.mockResolvedValue(new Uint8Array([9]).buffer);

    expect([...(await xaiVideoClient.download(xai, 'https://vidgen.x.ai/a.mp4'))]).toEqual([9]);
    await expect(
      xaiVideoClient.download(xai, 'http://169.254.169.254/latest'),
    ).rejects.toBeDefined();
  });
});
