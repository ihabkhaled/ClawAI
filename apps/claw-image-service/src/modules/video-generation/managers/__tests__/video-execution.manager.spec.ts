import { PaygCreditExhaustedError } from '@claw/shared-entitlements';
import { BillingErrorCode } from '@claw/shared-types';
import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { VideoFailureCode } from '../../../../common/enums';
import type { ExecuteVideoInput } from '../../types/video-generation.types';
import { VideoExecutionManager } from '../video-execution.manager';

const http = vi.hoisted(() => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  buildInterServiceAuthHeader: () => 'Service tok',
}));
const veo = vi.hoisted(() => ({ start: vi.fn(), poll: vi.fn(), download: vi.fn() }));

vi.mock('@common/utilities', () => http);
vi.mock('../../constants/video-provider-clients.constants', () => ({
  geminiVeoClient: veo,
  xaiVideoClient: { start: vi.fn(), poll: vi.fn(), download: vi.fn() },
}));

const HOLD = {
  metered: true,
  reservationId: 'res-1',
  heldMicroUsd: 400_000,
  maxOutputTokens: 1,
  clamped: false,
  availableAfterMicroUsd: 0,
  reason: null,
};

class FastManager extends VideoExecutionManager {
  protected override sleep(): Promise<void> {
    return Promise.resolve();
  }
}

describe('VideoExecutionManager', () => {
  let payg: {
    reserve: ReturnType<typeof vi.fn>;
    finalize: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
  let manager: FastManager;
  let cancelled: boolean;
  let input: ExecuteVideoInput;
  const onOperation = vi.fn();
  const onHoldReserved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector.test',
      FILE_SERVICE_URL: 'http://file.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
    payg = {
      reserve: vi.fn().mockResolvedValue(HOLD),
      finalize: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    manager = new FastManager(payg as never);
    cancelled = false;
    input = {
      generationId: 'gen-1',
      requestId: 'video:gen-1',
      userId: 'user-1',
      provider: 'VIDEO_GEMINI',
      model: 'models/veo-3.1-fast-generate-preview',
      prompt: 'A lighthouse at dusk',
      durationSeconds: 4,
      aspectRatio: '16:9',
      isCancelled: () => Promise.resolve(cancelled),
      onOperation,
      onHoldReserved,
    };
    http.httpGet.mockResolvedValue({ provider: 'GEMINI', apiKey: 'k', baseUrl: null });
    http.httpPost.mockResolvedValue({ fileId: 'file-1' });
    veo.start.mockResolvedValue('op-1');
    veo.poll.mockResolvedValue({ state: 'DONE', downloadUrl: 'https://g/v.mp4' });
    veo.download.mockResolvedValue(Buffer.from('mp4-bytes'));
  });

  it('reserves a hold sized on the SECONDS, priced by the bare model id', async () => {
    await manager.execute(input);

    expect(payg.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: 'GEMINI',
        model: 'veo-3.1-fast-generate-preview',
        surface: 'VIDEO',
        promptTokens: 0,
        videoSeconds: 4,
      }),
    );
    expect(onHoldReserved).toHaveBeenCalledWith('res-1');
  });

  it('stores the clip and hands back a settlement on the measured seconds, never tokens', async () => {
    const result = await manager.execute(input);

    expect(result).toMatchObject({ fileId: 'file-1', mimeType: 'video/mp4', durationSeconds: 4 });
    expect(result.settlement.calls).toEqual({ toolCalls: 0, videoSeconds: 4 });
    expect(result.settlement.usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
    });
    // Finalizing is the caller's job, after the asset row is written.
    expect(payg.finalize).not.toHaveBeenCalled();
    expect(payg.release).not.toHaveBeenCalled();
    const [url, body] = http.httpPost.mock.calls[0] ?? [];
    expect(url).toBe('http://file.test/api/v1/internal/files/store-generated-video');
    expect(body).toMatchObject({ userId: 'user-1', mimeType: 'video/mp4' });
  });

  it('never bills more seconds than were held', async () => {
    veo.poll.mockResolvedValue({ state: 'DONE', downloadUrl: 'u', durationSeconds: 9 });

    const result = await manager.execute(input);

    expect(result.settlement.calls.videoSeconds).toBe(4);
  });

  it('polls until done', async () => {
    veo.poll.mockResolvedValueOnce({ state: 'PENDING' });
    veo.poll.mockResolvedValueOnce({ state: 'PENDING' });

    await manager.execute(input);

    expect(veo.poll).toHaveBeenCalledTimes(3);
    expect(onOperation).toHaveBeenCalledWith('op-1');
  });

  it('releases the hold and reports the reason when the provider fails the job', async () => {
    veo.poll.mockResolvedValue({
      state: 'FAILED',
      code: VideoFailureCode.CONTENT_REJECTED,
      detail: 'blocked',
    });

    await expect(manager.execute(input)).rejects.toMatchObject({
      code: VideoFailureCode.CONTENT_REJECTED,
    });
    expect(payg.release).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-1' }),
      'PROVIDER_ERROR',
    );
    expect(payg.finalize).not.toHaveBeenCalled();
  });

  it('releases the hold when the provider refuses to start', async () => {
    veo.start.mockRejectedValue(new Error('boom'));

    await expect(manager.execute(input)).rejects.toThrow('boom');
    expect(payg.release).toHaveBeenCalledTimes(1);
  });

  it('releases the hold and stores nothing when the user cancels during the wait', async () => {
    veo.poll.mockImplementation(() => {
      cancelled = true;
      return Promise.resolve({ state: 'PENDING' });
    });

    await expect(manager.execute(input)).rejects.toMatchObject({
      code: 'VIDEO_GENERATION_CANCELLED',
    });
    expect(payg.release).toHaveBeenCalledWith(expect.anything(), 'CANCELLED');
    expect(http.httpPost).not.toHaveBeenCalled();
  });

  it('refuses before any hold when already cancelled', async () => {
    cancelled = true;

    await expect(manager.execute(input)).rejects.toMatchObject({
      code: 'VIDEO_GENERATION_CANCELLED',
    });
    expect(payg.reserve).not.toHaveBeenCalled();
  });

  it('releases the hold when file-service cannot store the clip', async () => {
    http.httpPost.mockRejectedValue(new Error('file down'));

    await expect(manager.execute(input)).rejects.toMatchObject({
      code: VideoFailureCode.STORAGE_FAILED,
    });
    expect(payg.release).toHaveBeenCalledWith(expect.anything(), 'CANCELLED');
    expect(payg.finalize).not.toHaveBeenCalled();
  });

  it('refuses an empty or oversized download and releases the hold', async () => {
    veo.download.mockResolvedValueOnce(Buffer.alloc(0));
    await expect(manager.execute(input)).rejects.toMatchObject({
      code: VideoFailureCode.NO_VIDEO_RETURNED,
    });

    veo.download.mockResolvedValueOnce(Buffer.alloc(41 * 1024 * 1024));
    await expect(manager.execute(input)).rejects.toMatchObject({
      code: VideoFailureCode.VIDEO_TOO_LARGE,
    });
    expect(payg.release).toHaveBeenCalledTimes(2);
  });

  it('turns a credit refusal into a 402 without dialling the provider', async () => {
    payg.reserve.mockRejectedValue(
      new PaygCreditExhaustedError(BillingErrorCode.PAYG_CREDIT_EXHAUSTED, 0, 400_000),
    );

    await expect(manager.execute(input)).rejects.toMatchObject({
      code: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      status: 402,
    });
    expect(veo.start).not.toHaveBeenCalled();
  });

  it('says the connector is missing when the config lookup fails', async () => {
    http.httpGet.mockRejectedValue(new Error('404'));

    await expect(manager.execute(input)).rejects.toMatchObject({
      code: VideoFailureCode.CONNECTOR_NOT_CONFIGURED,
    });
    expect(payg.reserve).not.toHaveBeenCalled();
  });

  it('refuses a provider it does not know', async () => {
    await expect(manager.execute({ ...input, provider: 'VIDEO_OPENAI' })).rejects.toMatchObject({
      code: 'UNSUPPORTED_VIDEO_PROVIDER',
    });
  });

  it('finalizes on the seconds when the caller settles, and releases on a failed persist', async () => {
    const { settlement } = await manager.execute(input);

    await manager.settle(settlement);
    await manager.releaseUnpersisted(settlement);
    await manager.releaseAbandoned('res-9', 'gen-9');

    expect(payg.finalize).toHaveBeenCalledWith(settlement.hold, settlement.usage, {
      toolCalls: 0,
      videoSeconds: 4,
    });
    expect(payg.release).toHaveBeenCalledWith(settlement.hold, 'CANCELLED');
    expect(payg.release).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-9' }),
      'CANCELLED',
    );
  });
});
