import { type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';

import { buildInterServiceAuthHeader, httpGet, httpPost } from '@common/utilities';

import { BusinessException } from '../../../../common/errors';
import { generateWithGemini } from '../../adapters/gemini-image.adapter';
import { generateWithOpenAI } from '../../adapters/openai-image.adapter';
import { editWithOpenAI } from '../../adapters/openai-image-edit.adapter';
import { IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS } from '../../constants/image-payg.constants';
import { ImageExecutionManager } from '../image-execution.manager';
import type { ExecuteImageInput } from '../../types/image-generation.types';

vi.mock('@common/utilities');
vi.mock('../../adapters/openai-image.adapter');
vi.mock('../../adapters/gemini-image.adapter');
vi.mock('../../adapters/stable-diffusion.adapter');
vi.mock('../../adapters/openai-image-edit.adapter');

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
const openaiEdit = { editWithOpenAI: vi.mocked(editWithOpenAI) };

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
  new ImageExecutionManager({ streamGenerate: vi.fn() } as never, payg as never, {} as never);

describe('ImageExecutionManager — image edits (pack §10/§81)', () => {
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

  it('sends an OpenAI job with a reference to /images/edits, metered on the sized gpt-image row', async () => {
    const payg = meter();
    utilities.httpGet.mockResolvedValue({ provider: 'OPENAI', apiKey: 'sk', baseUrl: undefined });
    openaiEdit.editWithOpenAI.mockResolvedValue({ imageBase64: 'AAA', mimeType: 'image/png' });

    await build(payg).execute(
      input({
        provider: 'IMAGE_OPENAI',
        model: 'dall-e-3',
        width: 1024,
        height: 1536,
        referenceImageBase64: 'c3Jj',
        referenceImageMimeType: 'image/jpeg',
        maskImageBase64: 'bWFzaw==',
      }),
    );

    expect(openai.generateWithOpenAI).not.toHaveBeenCalled();
    expect(openaiEdit.editWithOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-image-1',
        quality: 'high',
        imageBase64: 'c3Jj',
        maskBase64: 'bWFzaw==',
        width: 1024,
        height: 1536,
      }),
    );
    expect(payg.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'OPENAI',
        model: 'gpt-image-1@1024x1536',
        imageUnits: 1,
      }),
    );
  });

  it('refuses an edit on a provider that ignores the reference, before any hold', async () => {
    const payg = meter();
    await expect(
      build(payg).execute(
        input({
          provider: 'IMAGE_GROK',
          model: 'grok-imagine-image',
          referenceImageBase64: 'c3Jj',
        }),
      ),
    ).rejects.toMatchObject({ code: 'IMAGE_EDIT_UNAVAILABLE' });
    expect(payg.reserve).not.toHaveBeenCalled();
  });

  it('refuses a mask on Gemini with 422, before any hold', async () => {
    const payg = meter();
    const error: unknown = await build(payg)
      .execute(input({ referenceImageBase64: 'c3Jj', maskImageBase64: 'bQ==' }))
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BusinessException);
    expect((error as BusinessException).getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect((error as BusinessException).code).toBe('IMAGE_MASK_NOT_SUPPORTED');
    expect(payg.reserve).not.toHaveBeenCalled();
    expect(gemini.generateWithGemini).not.toHaveBeenCalled();
  });

  it('still sends a Gemini edit inline, with the reference', async () => {
    const payg = meter();
    gemini.generateWithGemini.mockResolvedValue({ imageBase64: 'AAA', mimeType: 'image/png' });
    await build(payg).execute(
      input({
        prompt: 'make it blue',
        referenceImageBase64: 'c3Jj',
        referenceImageMimeType: 'image/png',
      }),
    );
    expect(gemini.generateWithGemini).toHaveBeenCalledWith(
      expect.any(String),
      'k',
      'make it blue',
      'gemini-2.5-flash-image',
      'c3Jj',
      'image/png',
    );
  });
});
