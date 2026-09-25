import { type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import {
  BillingErrorCode,
  ModelCostClass,
  type ModelCostRates,
  PaygSurface,
} from '@claw/shared-types';
import { PaygCreditExhaustedError, type PaygMeter } from '@claw/shared-entitlements';
import { calculateCostMicroUsd } from '@claw/shared-utilities';

import { buildInterServiceAuthHeader, httpGet, httpPost } from '@common/utilities';

import { BusinessException } from '../../../../common/errors';
import { generateWithXai } from '../../adapters/xai-image.adapter';
import { IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS } from '../../constants/image-payg.constants';
import { ImageExecutionManager } from '../image-execution.manager';
import type { ComfyUIProgressAdapter } from '../../../runtime-progress/adapters/comfyui-progress.adapter';
import type { ExecuteImageInput, ImageSettlement } from '../../types/image-generation.types';

vi.mock('@common/utilities');
vi.mock('../../adapters/xai-image.adapter');

const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: appConfigGet },
}));

const utilities = {
  httpGet: vi.mocked(httpGet),
  httpPost: vi.mocked(httpPost),
  buildInterServiceAuthHeader: vi.mocked(buildInterServiceAuthHeader),
};
const xai = { generateWithXai: vi.mocked(generateWithXai) };

type MeterMock = { reserve: Mock; finalize: Mock; release: Mock };

const meter = (): MeterMock => ({
  reserve: vi.fn().mockResolvedValue({
    metered: true,
    reservationId: 'res-grok-1',
    maxOutputTokens: IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS,
    clamped: false,
    heldMicroUsd: 20_000,
    availableAfterMicroUsd: 980_000,
    reason: null,
  }),
  finalize: vi.fn().mockResolvedValue(undefined),
  release: vi.fn().mockResolvedValue(undefined),
});

const input = (overrides: Partial<ExecuteImageInput> = {}): ExecuteImageInput => ({
  prompt: 'a red apple',
  provider: 'IMAGE_GROK',
  model: 'grok-imagine-image',
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

// The routing model-cost seed v8 row for `GROK:grok-imagine-image`, as auth
// receives it: $0.02 per image, token rates published-and-zero.
const GROK_IMAGINE_IMAGE_V8_RATES: ModelCostRates = {
  provider: 'GROK',
  model: 'grok-imagine-image',
  version: 1,
  currency: 'USD',
  inputPerMillionMicroUsd: 0,
  outputPerMillionMicroUsd: 0,
  cachedInputPerMillionMicroUsd: null,
  cacheWritePerMillionMicroUsd: null,
  reasoningPerMillionMicroUsd: null,
  imagePerUnitMicroUsd: 20_000,
  audioPerUnitMicroUsd: null,
  videoPerUnitMicroUsd: null,
  toolCallPerUnitMicroUsd: null,
  searchCallPerUnitMicroUsd: null,
  ttsPerCharacterMicroUsd: null,
  costClass: ModelCostClass.CHEAP,
  isAdminOverride: false,
  effectiveFrom: '2026-09-25T00:00:00.000Z',
  lastVerifiedAt: null,
  source: 'SEED',
};

/** What auth-service charges for a finalize, from the settlement image-service sends. */
const consumptionMicroUsd = (settlement: ImageSettlement, rates: ModelCostRates): number =>
  calculateCostMicroUsd(
    {
      inputTokens: settlement.usage.promptTokens,
      cachedInputTokens: settlement.usage.cachedPromptTokens ?? 0,
      reasoningTokens: settlement.usage.reasoningTokens ?? 0,
      outputTokens: settlement.usage.completionTokens,
      toolCalls: settlement.calls.toolCalls ?? 0,
      searchCalls: 0,
      imageUnits: settlement.calls.imageUnits ?? 0,
    },
    rates,
  );

// Grok images used to settle at $0: no price row existed, routing's provider
// fallback priced `grok-imagine-image` at grok-4's TOKEN rate, and xAI reports
// no tokens. Routing seed v8 prices them per image; this is the metered path.
describe('ImageExecutionManager — Grok per-image metering (seed v8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({
      FILE_SERVICE_URL: 'http://file-service:4005',
      CONNECTOR_SERVICE_URL: 'http://connector-service:4004',
      INTER_SERVICE_AUTH_TOKEN: 'image-service-secret-token-aaaaaaaa',
    });
    utilities.buildInterServiceAuthHeader.mockReturnValue('Service image-token');
    utilities.httpGet.mockResolvedValue({ provider: 'GROK', apiKey: 'k', baseUrl: undefined });
    utilities.httpPost.mockResolvedValue({ fileId: 'file-1' });
    xai.generateWithXai.mockResolvedValue({
      imageBase64: '/9j/XAI',
      mimeType: 'image/jpeg',
      providerCostTicks: 200_000_000,
    });
  });

  it('reserves ONE image against the grok-imagine-image row on the GROK connector', async () => {
    const payg = meter();

    await build(payg).execute(input());

    expect(payg.reserve).toHaveBeenCalledTimes(1);
    expect(payg.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'GROK',
        model: 'grok-imagine-image',
        surface: PaygSurface.IMAGE,
        imageUnits: 1,
      }),
    );
  });

  it('finalizes on the image returned → a NON-ZERO charge of 20,000 micro-USD', async () => {
    const payg = meter();
    const manager = build(payg);

    const result = await manager.execute(input());
    // Open until persisted (rule 37 item 17).
    expect(payg.finalize).not.toHaveBeenCalled();
    await manager.settle(result.settlement);

    expect(payg.release).not.toHaveBeenCalled();
    expect(payg.finalize).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-grok-1' }),
      { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      { toolCalls: 0, imageUnits: 1 },
    );
    const settlement = result.settlement;
    expect(settlement).toBeDefined();
    if (settlement === undefined) {
      return;
    }
    // xAI's own price rides along for reconciliation, never into the charge.
    expect(settlement.providerCostTicks).toBe(200_000_000);
    expect(consumptionMicroUsd(settlement, GROK_IMAGINE_IMAGE_V8_RATES)).toBe(20_000);
  });

  it('meters an unknown Grok image model on the dearest Grok row (grok-imagine-image-2.0)', async () => {
    const payg = meter();

    await build(payg).execute(input({ model: 'grok-imagine-image-quality' }));

    expect(payg.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'GROK', model: 'grok-imagine-image-2.0' }),
    );
    // The provider call still names the model the user picked.
    expect(xai.generateWithXai.mock.calls[0]?.[3]).toBe('grok-imagine-image-quality');
  });

  it('blocks with PAYG_MODEL_UNPRICED — never a $0 image — when no Grok row exists', async () => {
    const payg = meter();
    payg.reserve.mockRejectedValue(
      new PaygCreditExhaustedError(BillingErrorCode.PAYG_MODEL_UNPRICED, 0, 0),
    );

    const error = await build(payg)
      .execute(input({ model: 'grok-imagine-image-2.0' }))
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(BusinessException);
    const business = error as BusinessException;
    expect(business.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
    expect(business.code).toBe(BillingErrorCode.PAYG_MODEL_UNPRICED);
    expect(xai.generateWithXai).not.toHaveBeenCalled();
    expect(payg.finalize).not.toHaveBeenCalled();
  });
});
