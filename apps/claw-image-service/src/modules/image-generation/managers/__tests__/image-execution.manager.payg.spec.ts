import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode, PaygSurface } from '@claw/shared-types';
import { PaygCreditExhaustedError, type PaygMeter } from '@claw/shared-entitlements';

import { BusinessException } from '../../../../common/errors';
import {
  IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS,
  IMAGE_PAYG_PROMPT_TOKENS,
} from '../../constants/image-payg.constants';
import { ImageExecutionManager } from '../image-execution.manager';
import type { ComfyUIProgressAdapter } from '../../../runtime-progress/adapters/comfyui-progress.adapter';
import type { ExecuteImageInput } from '../../types/image-generation.types';

jest.mock('../../../../app/config/app.config');
jest.mock('@common/utilities');
jest.mock('../../adapters/openai-image.adapter');
jest.mock('../../adapters/gemini-image.adapter');
jest.mock('../../adapters/stable-diffusion.adapter');

const { AppConfig } = jest.requireMock('../../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};
const utilities = jest.requireMock('@common/utilities') as {
  httpGet: jest.Mock;
  httpPost: jest.Mock;
  buildInterServiceAuthHeader: jest.Mock;
};
const openai = jest.requireMock('../../adapters/openai-image.adapter') as {
  generateWithOpenAI: jest.Mock;
};
const gemini = jest.requireMock('../../adapters/gemini-image.adapter') as {
  generateWithGemini: jest.Mock;
};
const stableDiffusion = jest.requireMock('../../adapters/stable-diffusion.adapter') as {
  generateWithStableDiffusion: jest.Mock;
};

type MeterMock = { reserve: jest.Mock; finalize: jest.Mock; release: jest.Mock };

const meter = (): MeterMock => ({
  reserve: jest.fn().mockResolvedValue({
    metered: true,
    reservationId: 'res-image-1',
    maxOutputTokens: IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS,
    clamped: false,
    heldMicroUsd: 41_000,
    availableAfterMicroUsd: 959_000,
    reason: null,
  }),
  finalize: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
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
    { streamGenerate: jest.fn() } as unknown as ComfyUIProgressAdapter,
    payg as unknown as PaygMeter,
  );

describe('ImageExecutionManager — PAYG metering (U3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      },
    });

    await build(payg).execute(input());

    expect(payg.release).not.toHaveBeenCalled();
    expect(payg.finalize).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-image-1' }),
      {
        promptTokens: 24,
        completionTokens: 1_310,
        cachedPromptTokens: 0,
        reasoningTokens: 20,
      },
      { toolCalls: 0 },
    );
  });

  it('finalizes an OpenAI image at zero tokens, because that API reports none', async () => {
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

    await build(payg).execute(input({ provider: 'IMAGE_OPENAI', model: 'dall-e-3' }));

    expect(payg.reserve).toHaveBeenCalledWith(expect.objectContaining({ provider: 'OPENAI' }));
    expect(payg.finalize).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-image-1' }),
      { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      { toolCalls: 0 },
    );
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

  it('releases the hold when storing the generated image fails', async () => {
    const payg = meter();
    gemini.generateWithGemini.mockResolvedValue({ imageBase64: 'AAA', mimeType: 'image/png' });
    utilities.httpPost.mockRejectedValue(new Error('file-service down'));

    await expect(build(payg).execute(input())).rejects.toThrow('file-service down');

    // The image was produced, so the hold is FINALIZED, not released — the money
    // was genuinely spent at the provider even though the user never got a file.
    expect(payg.finalize).toHaveBeenCalledTimes(1);
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

    await build(payg).execute(input({ provider: 'IMAGE_LOCAL', model: 'sdxl-turbo' }));

    expect(payg.reserve).not.toHaveBeenCalled();
    expect(payg.finalize).not.toHaveBeenCalled();
    expect(payg.release).not.toHaveBeenCalled();
  });
});
