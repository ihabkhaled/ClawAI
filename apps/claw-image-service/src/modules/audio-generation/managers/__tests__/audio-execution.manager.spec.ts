import { PaygCreditExhaustedError } from '@claw/shared-entitlements';
import { BillingErrorCode } from '@claw/shared-types';
import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { AudioFailureCode } from '../../../../common/enums';
import { AudioKind } from '../../../../generated/prisma';
import type { ExecuteAudioInput } from '../../types/audio-generation.types';
import { AudioExecutionManager } from '../audio-execution.manager';

const http = vi.hoisted(() => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  buildInterServiceAuthHeader: () => 'Service tok',
}));
const clients = vi.hoisted(() => ({
  openai: { synthesize: vi.fn() },
  gemini: { synthesize: vi.fn() },
  lyria: { synthesize: vi.fn() },
}));

vi.mock('@common/utilities', () => http);
vi.mock('../../constants/audio-provider-clients.constants', () => ({
  AUDIO_CLIENTS: new Map([
    ['SPEECH:AUDIO_OPENAI', clients.openai],
    ['SPEECH:AUDIO_GEMINI', clients.gemini],
    ['MUSIC:AUDIO_GEMINI', clients.lyria],
  ]),
}));

const HOLD = {
  metered: true,
  reservationId: 'res-1',
  heldMicroUsd: 1_000,
  maxOutputTokens: 400,
  clamped: false,
  availableAfterMicroUsd: 0,
  reason: null,
};

describe('AudioExecutionManager', () => {
  let payg: {
    reserve: ReturnType<typeof vi.fn>;
    finalize: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
  let manager: AudioExecutionManager;
  let cancelled: boolean;
  let input: ExecuteAudioInput;
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
    manager = new AudioExecutionManager(payg as never);
    cancelled = false;
    input = {
      generationId: 'gen-1',
      requestId: 'audio:gen-1',
      userId: 'user-1',
      kind: AudioKind.SPEECH,
      provider: 'AUDIO_OPENAI',
      model: 'tts-1',
      prompt: 'Hello there',
      voice: 'alloy',
      format: 'mp3',
      isCancelled: () => Promise.resolve(cancelled),
      onHoldReserved,
    };
    http.httpGet.mockResolvedValue({ provider: 'OPENAI', apiKey: 'k', baseUrl: null });
    http.httpPost.mockResolvedValue({ fileId: 'file-1' });
    clients.openai.synthesize.mockResolvedValue({
      bytes: Buffer.from('mp3'),
      mimeType: 'audio/mpeg',
      durationSeconds: null,
      usage: null,
    });
    clients.gemini.synthesize.mockResolvedValue({
      bytes: Buffer.from('wav'),
      mimeType: 'audio/wav',
      durationSeconds: 2,
      usage: { promptTokens: 7, completionTokens: 50 },
    });
    clients.lyria.synthesize.mockResolvedValue({
      bytes: Buffer.from('mp3'),
      mimeType: 'audio/mpeg',
      durationSeconds: 30,
      usage: null,
    });
  });

  it('sends the Service token header on the connector config request', async () => {
    await manager.execute(input);

    const call = http.httpGet.mock.calls.find((c) =>
      String(c[0]).includes('/internal/connectors/config'),
    );
    expect(call?.[1]).toMatchObject({ headers: { Authorization: 'Service tok' } });
  });

  it('meters OpenAI speech per CHARACTER on the TTS surface and settles on the characters sent', async () => {
    const result = await manager.execute(input);

    expect(payg.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'OPENAI',
        model: 'tts-1',
        surface: 'TTS',
        promptTokens: 0,
        ttsCharacters: 11,
      }),
    );
    expect(onHoldReserved).toHaveBeenCalledWith('res-1');
    expect(result.settlement.calls).toEqual({ toolCalls: 0, ttsCharacters: 11 });
    expect(result.settlement.usage.completionTokens).toBe(0);
    // Finalizing is the caller's job, after the asset row is written.
    expect(payg.finalize).not.toHaveBeenCalled();
    const [url, body] = http.httpPost.mock.calls[0] ?? [];
    expect(url).toBe('http://file.test/api/v1/internal/files/store-generated-audio');
    expect(body).toMatchObject({
      userId: 'user-1',
      mimeType: 'audio/mpeg',
      transcript: 'Hello there',
    });
  });

  it('meters Gemini TTS on tokens: sends the hold ceiling and settles on reported usage', async () => {
    const result = await manager.execute({
      ...input,
      provider: 'AUDIO_GEMINI',
      model: 'models/gemini-2.5-flash-preview-tts',
      voice: 'Kore',
    });

    expect(payg.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'GEMINI',
        model: 'gemini-2.5-flash-preview-tts',
        surface: 'TTS',
        requestedMaxOutputTokens: 44,
      }),
    );
    expect(clients.gemini.synthesize.mock.calls[0]?.[1]).toMatchObject({ maxOutputTokens: 400 });
    expect(result.settlement.usage).toMatchObject({ promptTokens: 7, completionTokens: 50 });
    expect(result.settlement.calls).toEqual({ toolCalls: 0 });
  });

  it('settles Gemini TTS on the hold estimate when the reply reports no usage', async () => {
    clients.gemini.synthesize.mockResolvedValue({
      bytes: Buffer.from('wav'),
      mimeType: 'audio/wav',
      durationSeconds: 2,
      usage: null,
    });

    const result = await manager.execute({ ...input, provider: 'AUDIO_GEMINI', model: 'x-tts' });

    expect(result.settlement.usage.completionTokens).toBe(44);
    expect(result.settlement.usage.promptTokens).toBeGreaterThan(0);
  });

  it('meters a song as one unit', async () => {
    const result = await manager.execute({
      ...input,
      kind: AudioKind.MUSIC,
      provider: 'AUDIO_GEMINI',
      model: 'lyria-3-clip-preview',
    });

    expect(payg.reserve).toHaveBeenCalledWith(expect.objectContaining({ imageUnits: 1 }));
    expect(result.settlement.calls).toEqual({ toolCalls: 0, imageUnits: 1 });
    expect(result.durationSeconds).toBe(30);
  });

  it('refuses a clamped Gemini ceiling instead of cutting speech off, and releases the hold', async () => {
    payg.reserve.mockResolvedValue({ ...HOLD, clamped: true });

    await expect(
      manager.execute({ ...input, provider: 'AUDIO_GEMINI', model: 'x-tts' }),
    ).rejects.toMatchObject({ status: 402 });
    expect(clients.gemini.synthesize).not.toHaveBeenCalled();
    expect(payg.release).toHaveBeenCalledWith(expect.anything(), 'PROVIDER_ERROR');
  });

  it('releases the hold when the provider fails', async () => {
    clients.openai.synthesize.mockRejectedValue(new Error('boom'));

    await expect(manager.execute(input)).rejects.toThrow('boom');
    expect(payg.release).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-1' }),
      'PROVIDER_ERROR',
    );
    expect(payg.finalize).not.toHaveBeenCalled();
  });

  it('releases the hold and stores nothing when cancelled after the provider answered', async () => {
    clients.openai.synthesize.mockImplementation(() => {
      cancelled = true;
      return Promise.resolve({
        bytes: Buffer.from('x'),
        mimeType: 'audio/mpeg',
        durationSeconds: null,
        usage: null,
      });
    });

    await expect(manager.execute(input)).rejects.toMatchObject({
      code: 'AUDIO_GENERATION_CANCELLED',
    });
    expect(payg.release).toHaveBeenCalledWith(expect.anything(), 'CANCELLED');
    expect(http.httpPost).not.toHaveBeenCalled();
  });

  it('refuses before any hold when already cancelled', async () => {
    cancelled = true;

    await expect(manager.execute(input)).rejects.toMatchObject({
      code: 'AUDIO_GENERATION_CANCELLED',
    });
    expect(payg.reserve).not.toHaveBeenCalled();
  });

  it('releases the hold when file-service cannot store the audio', async () => {
    http.httpPost.mockRejectedValue(new Error('file down'));

    await expect(manager.execute(input)).rejects.toMatchObject({
      code: AudioFailureCode.STORAGE_FAILED,
    });
    expect(payg.release).toHaveBeenCalledWith(expect.anything(), 'CANCELLED');
    expect(payg.finalize).not.toHaveBeenCalled();
  });

  it('refuses an empty or oversized result and releases the hold', async () => {
    clients.openai.synthesize.mockResolvedValueOnce({
      bytes: Buffer.alloc(0),
      mimeType: 'audio/mpeg',
      durationSeconds: null,
      usage: null,
    });
    await expect(manager.execute(input)).rejects.toMatchObject({
      code: AudioFailureCode.NO_AUDIO_RETURNED,
    });

    clients.openai.synthesize.mockResolvedValueOnce({
      bytes: Buffer.alloc(41 * 1024 * 1024),
      mimeType: 'audio/mpeg',
      durationSeconds: null,
      usage: null,
    });
    await expect(manager.execute(input)).rejects.toMatchObject({
      code: AudioFailureCode.AUDIO_TOO_LARGE,
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
    expect(clients.openai.synthesize).not.toHaveBeenCalled();
  });

  it('says the connector is missing when the config lookup fails', async () => {
    http.httpGet.mockRejectedValue(new Error('404'));

    await expect(manager.execute(input)).rejects.toMatchObject({
      code: AudioFailureCode.CONNECTOR_NOT_CONFIGURED,
    });
    expect(payg.reserve).not.toHaveBeenCalled();
  });

  it('refuses a provider or kind it does not serve', async () => {
    await expect(manager.execute({ ...input, provider: 'AUDIO_XAI' })).rejects.toMatchObject({
      code: 'UNSUPPORTED_AUDIO_PROVIDER',
    });
    await expect(manager.execute({ ...input, kind: AudioKind.MUSIC })).rejects.toMatchObject({
      code: 'UNSUPPORTED_AUDIO_PROVIDER',
    });
  });

  it('finalizes when the caller settles, and releases on a failed persist or a dead process', async () => {
    const { settlement } = await manager.execute(input);

    await manager.settle(settlement);
    await manager.releaseUnpersisted(settlement);
    await manager.releaseAbandoned('res-9', 'gen-9');

    expect(payg.finalize).toHaveBeenCalledWith(settlement.hold, settlement.usage, {
      toolCalls: 0,
      ttsCharacters: 11,
    });
    expect(payg.release).toHaveBeenCalledWith(settlement.hold, 'CANCELLED');
    expect(payg.release).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-9' }),
      'CANCELLED',
    );
  });
});
