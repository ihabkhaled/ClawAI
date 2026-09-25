import { type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode, PaygSurface, TokenUsageSource } from '@claw/shared-types';
import { PaygCreditExhaustedError, type PaygMeter } from '@claw/shared-entitlements';

import { buildInterServiceAuthHeader, httpGet, httpPost } from '@common/utilities';

import { BusinessException } from '../../../../common/errors';
import { generateWithGemini } from '../../adapters/gemini-image.adapter';
import { generateWithOpenAI } from '../../adapters/openai-image.adapter';
import { generateWithStableDiffusion } from '../../adapters/stable-diffusion.adapter';
import {
  IMAGE_PAYG_IMAGES_PER_REQUEST,
  IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS,
  IMAGE_PAYG_PROMPT_TOKENS,
} from '../../constants/image-payg.constants';
import { ImageExecutionManager } from '../image-execution.manager';
import type { ComfyUIProgressAdapter } from '../../../runtime-progress/adapters/comfyui-progress.adapter';
import type { ExecuteImageInput } from '../../types/image-generation.types';

vi.mock('@common/utilities');
vi.mock('../../adapters/openai-image.adapter');
vi.mock('../../adapters/gemini-image.adapter');
vi.mock('../../adapters/stable-diffusion.adapter');

// AppConfig exposes a STATIC get(); neither a bare automock nor importMock
// hands that same static back, so the spec configured one object while the code
// under test read another. A hoisted vi.fn keeps both on one mock.
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: appConfigGet },
}));

const AppConfig = { get: appConfigGet };
// vi.importMock hands back a FRESH automock, not the instance the manager
// imported, so anything configured on it was invisible to the code under test.
// Mocking the real imported binding is the same handle the manager holds.
const utilities = {
  httpGet: vi.mocked(httpGet),
  httpPost: vi.mocked(httpPost),
  buildInterServiceAuthHeader: vi.mocked(buildInterServiceAuthHeader),
};
const openai = { generateWithOpenAI: vi.mocked(generateWithOpenAI) };
const gemini = { generateWithGemini: vi.mocked(generateWithGemini) };
const stableDiffusion = { generateWithStableDiffusion: vi.mocked(generateWithStableDiffusion) };

type MeterMock = { reserve: Mock; finalize: Mock; release: Mock };

const meter = (): MeterMock => ({
  reserve: vi.fn().mockResolvedValue({
    metered: true,
    reservationId: 'res-image-1',
    maxOutputTokens: IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS,
    clamped: false,
    heldMicroUsd: 41_000,
    availableAfterMicroUsd: 959_000,
    reason: null,
  }),
  finalize: vi.fn().mockResolvedValue(undefined),
  release: vi.fn().mockResolvedValue(undefined),
});

const input = (overrides: Partial<ExecuteImageInput> = {}): ExecuteImageInput => ({
  prompt: 'a cute tabby cat',
  provider: 'IMAGE_GEMINI',
  model: 'gemini-2.5-flash-image',
  userId: 'user-1',
  requestId: 'gen-1:attempt-a',
  ...overrides,
});

const build = (payg: MeterMock): ImageExecutionManager =>
  new ImageExecutionManager(
    { streamGenerate: vi.fn() } as unknown as ComfyUIProgressAdapter,
    payg as unknown as PaygMeter,
    {} as never,
  );

describe('ImageExecutionManager — PAYG metering (U3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AppConfig.get.mockReturnValue({
      FILE_SERVICE_URL: 'http://file-service:4005',
      CONNECTOR_SERVICE_URL: 'http://connector-service:4004',
      STABLE_DIFFUSION_URL: 'http://stable-diffusion:7860',
      COMFYUI_BASE_URL: 'http://comfyui:8188',
      INTER_SERVICE_AUTH_TOKEN: 'image-service-secret-token-aaaaaaaa',
    });
    utilities.buildInterServiceAuthHeader.mockReturnValue('Service image-token');
    utilities.httpGet.mockResolvedValue({ provider: 'GEMINI', apiKey: 'k', baseUrl: undefined });
    utilities.httpPost.mockResolvedValue({ fileId: 'file-1' });
  });

  it('reserves against the IMAGE surface with the connector provider name', async () => {
    const payg = meter();
    gemini.generateWithGemini.mockResolvedValue({ imageBase64: 'AAA', mimeType: 'image/png' });

    await build(payg).execute(input());

    expect(payg.reserve).toHaveBeenCalledTimes(1);
    expect(payg.reserve).toHaveBeenCalledWith({
      userId: 'user-1',
      requestId: 'gen-1:attempt-a',
      // The internal IMAGE_GEMINI tag is mapped to the connector-level name the
      // auth-service classifies on. Sending IMAGE_GEMINI would resolve as an
      // unknown provider and take the wrong PAYG default.
      provider: 'GEMINI',
      model: 'gemini-2.5-flash-image',
      surface: PaygSurface.IMAGE,
      promptTokens: IMAGE_PAYG_PROMPT_TOKENS,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS,
      // One hold per paid call, sized on the images this call will produce.
      imageUnits: IMAGE_PAYG_IMAGES_PER_REQUEST,
    });
  });

  it('finalizes a Gemini image with the usage the provider actually reported', async () => {
    const payg = meter();
    gemini.generateWithGemini.mockResolvedValue({
      imageBase64: 'AAA',
      mimeType: 'image/png',
      usage: {
        promptTokens: 24,
        completionTokens: 1_310,
        totalTokens: 1_334,
        cachedPromptTokens: 0,
        reasoningTokens: 20,
        estimated: false,
        source: TokenUsageSource.NATIVE,
      },
    });

    const manager = build(payg);
    const result = await manager.execute(input());
    // The hold stays OPEN through execute: the caller settles it only after
    // the asset row is persisted (rule 37 item 17).
    expect(payg.finalize).not.toHaveBeenCalled();
    await manager.settle(result.settlement);

    expect(payg.release).not.toHaveBeenCalled();
    expect(payg.finalize).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-image-1' }),
      {
        promptTokens: 24,
        completionTokens: 1_310,
        cachedPromptTokens: 0,
        reasoningTokens: 20,
      },
      { toolCalls: 0, imageUnits: 1 },
    );
  });

  it('finalizes an OpenAI image on the image it returned, since that API reports no tokens', async () => {
    const payg = meter();
    // DALL-E answers with a URL, so the connector-config GET and the image
    // download share this mock and are told apart by path.
    utilities.httpGet.mockImplementation((url: string) =>
      url.includes('/internal/connectors/config')
        ? Promise.resolve({ provider: 'OPENAI', apiKey: 'k' })
        : Promise.resolve(new ArrayBuffer(8)),
    );
    openai.generateWithOpenAI.mockResolvedValue({
      imageUrl: 'https://example.test/i.png',
      mimeType: 'image/png',
    });

    const manager = build(payg);
    const result = await manager.execute(input({ provider: 'IMAGE_OPENAI', model: 'dall-e-3' }));
    await manager.settle(result.settlement);

    expect(payg.reserve).toHaveBeenCalledWith(expect.objectContaining({ provider: 'OPENAI' }));
    expect(payg.finalize).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-image-1' }),
      { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      // The per-image price is charged on this count. Zero tokens alone used to
      // settle every OpenAI image at $0.
      { toolCalls: 0, imageUnits: 1 },
    );
  });

  it('meters a gpt-image-1 generation: one image reserved, one image settled, one hold', async () => {
    const payg = meter();
    utilities.httpGet.mockResolvedValue({ provider: 'OPENAI', apiKey: 'k' });
    openai.generateWithOpenAI.mockResolvedValue({ imageBase64: 'AAA', mimeType: 'image/png' });

    const manager = build(payg);
    const result = await manager.execute(input({ provider: 'IMAGE_OPENAI', model: 'gpt-image-1' }));
    await manager.settle(result.settlement);

    expect(payg.reserve).toHaveBeenCalledTimes(1);
    expect(payg.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'OPENAI',
        // The sized price row (seed v7), not the bare model: 1024x1024 default.
        model: 'gpt-image-1@1024x1024',
        surface: PaygSurface.IMAGE,
        imageUnits: 1,
      }),
    );
    // The PROVIDER call still names the real model.
    expect(openai.generateWithOpenAI.mock.calls[0]?.[3]).toBe('gpt-image-1');
    expect(payg.finalize).toHaveBeenCalledTimes(1);
    expect(payg.finalize).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-image-1' }),
      expect.any(Object),
      { toolCalls: 0, imageUnits: 1 },
    );
    expect(payg.release).not.toHaveBeenCalled();
  });

  it.each([
    [1024, 1024, 'gpt-image-1@1024x1024'],
    [1536, 1024, 'gpt-image-1@1536x1024'],
    [1024, 1536, 'gpt-image-1@1024x1536'],
    [768, 768, 'gpt-image-1@1536x1024'],
  ])(
    'gpt-image-1 at %dx%d reserves on %s, and finalize settles that same hold',
    async (width, height, priceKey) => {
      const payg = meter();
      utilities.httpGet.mockResolvedValue({ provider: 'OPENAI', apiKey: 'k' });
      openai.generateWithOpenAI.mockResolvedValue({ imageBase64: 'AAA', mimeType: 'image/png' });

      const manager = build(payg);
      const result = await manager.execute(
        input({ provider: 'IMAGE_OPENAI', model: 'gpt-image-1', width, height }),
      );
      await manager.settle(result.settlement);

      expect(payg.reserve).toHaveBeenCalledWith(expect.objectContaining({ model: priceKey }));
      const hold: unknown = await payg.reserve.mock.results[0]?.value;
      expect(payg.finalize).toHaveBeenCalledTimes(1);
      expect(payg.finalize.mock.calls[0]?.[0]).toBe(hold);
      expect(result.settlement?.hold).toBe(hold);
    },
  );

  it('releases (never finalizes) when OpenAI refuses the generation', async () => {
    const payg = meter();
    utilities.httpGet.mockResolvedValue({ provider: 'OPENAI', apiKey: 'k' });
    openai.generateWithOpenAI.mockRejectedValue(new Error('openai 400'));

    await expect(
      build(payg).execute(input({ provider: 'IMAGE_OPENAI', model: 'gpt-image-1' })),
    ).rejects.toThrow('openai 400');

    expect(payg.release).toHaveBeenCalledTimes(1);
    expect(payg.release).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-image-1' }),
      'PROVIDER_ERROR',
    );
    expect(payg.finalize).not.toHaveBeenCalled();
  });

  it('never sends the clamped output ceiling to the image API', async () => {
    const payg = meter();
    payg.reserve.mockResolvedValue({
      metered: true,
      reservationId: 'res-image-1',
      maxOutputTokens: 512,
      clamped: true,
      heldMicroUsd: 4_000,
      availableAfterMicroUsd: 0,
      reason: null,
    });
    gemini.generateWithGemini.mockResolvedValue({ imageBase64: 'AAA', mimeType: 'image/png' });

    await build(payg).execute(input());

    // An image response is not token-bounded — neither adapter takes a
    // max-output-token argument, so the clamp can only size the hold here.
    const args = gemini.generateWithGemini.mock.calls[0] as unknown[];
    expect(args).not.toContain(512);
  });

  it('releases the hold when the provider call throws', async () => {
    const payg = meter();
    const boom = new Error('gemini exploded');
    gemini.generateWithGemini.mockRejectedValue(boom);

    await expect(build(payg).execute(input())).rejects.toThrow('gemini exploded');

    expect(payg.release).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-image-1' }),
      'PROVIDER_ERROR',
    );
    expect(payg.finalize).not.toHaveBeenCalled();
  });

  // Rule 37 item 17: the user never pays for an image that was not saved.
  // Before 2026-09-25 the hold was finalized before the store, so a
  // file-service outage charged the user for a picture they never got.
  it('releases the hold exactly once (never finalizes) when storing the generated image fails', async () => {
    const payg = meter();
    gemini.generateWithGemini.mockResolvedValue({ imageBase64: 'AAA', mimeType: 'image/png' });
    utilities.httpPost.mockRejectedValue(new Error('file-service down'));

    const error = await build(payg)
      .execute(input())
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(BusinessException);
    expect((error as BusinessException).code).toBe('IMAGE_STORAGE_FAILED');
    expect(payg.finalize).not.toHaveBeenCalled();
    expect(payg.release).toHaveBeenCalledTimes(1);
    expect(payg.release).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-image-1' }),
      'CANCELLED',
    );
  });

  it('settle and releaseUnpersisted are no-ops for an attempt with no hold (local provider)', async () => {
    const payg = meter();
    const manager = build(payg);

    await manager.settle(undefined);
    await manager.releaseUnpersisted(undefined);

    expect(payg.finalize).not.toHaveBeenCalled();
    expect(payg.release).not.toHaveBeenCalled();
  });

  it('maps a 402 from the meter to PAYMENT_REQUIRED carrying the meter errorCode', async () => {
    const payg = meter();
    payg.reserve.mockRejectedValue(
      new PaygCreditExhaustedError(BillingErrorCode.PAYG_CREDIT_EXHAUSTED, 1_200, 41_000),
    );

    const error = await build(payg)
      .execute(input())
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(BusinessException);
    const business = error as BusinessException;
    expect(business.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
    expect(business.code).toBe(BillingErrorCode.PAYG_CREDIT_EXHAUSTED);
    expect(gemini.generateWithGemini).not.toHaveBeenCalled();
  });

  it('does not touch the meter for a local Stable Diffusion generation', async () => {
    const payg = meter();
    stableDiffusion.generateWithStableDiffusion.mockResolvedValue({
      imageBase64: 'AAA',
      mimeType: 'image/png',
    });

    const result = await build(payg).execute(
      input({ provider: 'IMAGE_LOCAL', model: 'sdxl-turbo' }),
    );

    expect(result.settlement).toBeUndefined();
    expect(payg.reserve).not.toHaveBeenCalled();
    expect(payg.finalize).not.toHaveBeenCalled();
    expect(payg.release).not.toHaveBeenCalled();
  });
});
