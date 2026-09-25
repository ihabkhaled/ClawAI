// Multimodal batch 8: the frames request never throws into the turn — every
// failure becomes a reason and the lane goes on with the transcript.

import { vi } from 'vitest';

import { VIDEO_FRAMES_FETCH_TIMEOUT_MS } from '../../constants/video-delivery.constants';
import { toVideoFrames } from '../../utilities/video-frames-wire.utility';
import { VideoFramesClient } from '../video-frames.client';

const { httpRequest } = vi.hoisted(() => ({ httpRequest: vi.fn() }));

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service t'),
  httpRequest,
}));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ FILE_SERVICE_URL: 'http://file:4006' }) },
}));

const frame = (timestampMs: number): Record<string, unknown> => ({
  timestampMs,
  mimeType: 'image/jpeg',
  base64: 'RlJBTUU=',
});

describe('VideoFramesClient', () => {
  beforeEach(() => {
    httpRequest.mockReset();
  });

  it('asks file-service for the timestamps with the service token and the owner, bounded', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: [frame(5_000), frame(1_000)] });

    const result = await new VideoFramesClient().fetchFrames('vid 1', 'user-1', [1_000, 5_000]);

    expect(httpRequest).toHaveBeenCalledWith({
      url: 'http://file:4006/api/v1/internal/files/vid%201/video-frames',
      method: 'POST',
      headers: { Authorization: 'Service t' },
      body: { userId: 'user-1', timestampsMs: [1_000, 5_000] },
      timeoutMs: VIDEO_FRAMES_FETCH_TIMEOUT_MS,
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.frames.map((item) => item.timestampMs)).toEqual([1_000, 5_000]);
  });

  it.each([
    ['a non-2xx answer', { ok: false, status: 409, data: {} }, 'status_409'],
    ['a malformed body', { ok: true, status: 200, data: { frames: [] } }, 'malformed_or_empty'],
    ['an empty list', { ok: true, status: 200, data: [] }, 'malformed_or_empty'],
  ])('degrades on %s', async (_label, response, reason) => {
    httpRequest.mockResolvedValue(response);

    await expect(new VideoFramesClient().fetchFrames('v', 'u', [0])).resolves.toMatchObject({
      ok: false,
      reason,
    });
  });

  it('degrades on a timeout or network error instead of throwing', async () => {
    httpRequest.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    await expect(new VideoFramesClient().fetchFrames('v', 'u', [0])).resolves.toMatchObject({
      ok: false,
      reason: 'AbortError',
    });
  });
});

describe('toVideoFrames', () => {
  it('drops the whole answer when any element is not a frame', () => {
    expect(toVideoFrames([frame(0), { timestampMs: 1, mimeType: 'text/html', base64: 'x' }])).toBe(
      null,
    );
    expect(
      toVideoFrames([frame(0), { timestampMs: -1, mimeType: 'image/jpeg', base64: 'x' }]),
    ).toBe(null);
    expect(
      toVideoFrames([frame(0), { timestampMs: 1.5, mimeType: 'image/jpeg', base64: 'x' }]),
    ).toBe(null);
    expect(toVideoFrames([null])).toBeNull();
    expect(toVideoFrames('nope')).toBeNull();
  });
});
