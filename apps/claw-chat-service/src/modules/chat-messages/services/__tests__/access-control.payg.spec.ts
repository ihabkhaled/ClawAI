import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode, PaygSurface, TokenLedgerContext } from '@claw/shared-types';
import { PaygCreditExhaustedError, type PaygHold, type PaygMeter } from '@claw/shared-entitlements';

import { AccessControlService } from '../access-control.service';
import {
  PAYG_CREDIT_ERROR_MESSAGES,
  PAYG_SURFACE_BY_TOKEN_CONTEXT,
} from '../../constants/payg.constants';

jest.mock('../../clients/model-exposure.client', () => ({
  ModelExposureClient: jest.fn().mockImplementation(() => ({
    isExposed: jest.fn().mockResolvedValue(true),
  })),
}));
jest.mock('@claw/shared-entitlements', () => {
  const actual = jest.requireActual('@claw/shared-entitlements');
  return { ...actual, EntitlementsAdapter: jest.fn().mockImplementation(() => ({})) };
});
jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: jest.fn().mockReturnValue({ AUTH_SERVICE_URL: 'http://auth:4001' }) },
}));

const hold: PaygHold = {
  metered: true,
  maxOutputTokens: 900,
  clamped: true,
  reservationId: 'res-1',
  heldMicroUsd: 9_000,
  availableAfterMicroUsd: 0,
  reason: null,
};

describe('AccessControlService — the PAYG gate', () => {
  let meter: { reserve: jest.Mock; finalize: jest.Mock; release: jest.Mock };
  let service: AccessControlService;

  beforeEach(() => {
    jest.clearAllMocks();
    meter = {
      reserve: jest.fn().mockResolvedValue(hold),
      finalize: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
    service = new AccessControlService(meter as unknown as PaygMeter);
  });

  it('passes the reservation straight through to the meter', async () => {
    await expect(
      service.reserveCredit({
        userId: 'u1',
        requestId: 'r1',
        provider: 'OPENAI',
        model: 'gpt-5',
        surface: PaygSurface.CHAT,
        promptTokens: 100,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: 4096,
      }),
    ).resolves.toBe(hold);
  });

  it('maps a credit refusal to a 402 with the credit-specific code', async () => {
    meter.reserve.mockRejectedValue(
      new PaygCreditExhaustedError(BillingErrorCode.PAYG_CREDIT_EXHAUSTED, 1200, 50_000),
    );

    await expect(
      service.reserveCredit({
        userId: 'u1',
        requestId: 'r1',
        provider: 'OPENAI',
        model: 'gpt-5',
        surface: PaygSurface.CHAT,
        promptTokens: 100,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: 4096,
      }),
    ).rejects.toMatchObject({
      code: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      status: HttpStatus.PAYMENT_REQUIRED,
    });
  });

  it('never dresses an unrelated failure up as a payment problem', () => {
    const boom = new Error('connector-service is down');
    expect(service.toCreditException(boom)).toBe(boom);
  });

  it('the refusal message names no provider rate, plan ceiling or margin', () => {
    for (const message of Object.values(PAYG_CREDIT_ERROR_MESSAGES)) {
      expect(message).not.toMatch(/rate|ceiling|margin|micro|\$\d/i);
    }
  });

  describe('meterOrchestrationCall', () => {
    it('reserves, runs with the held ceiling, then finalizes the measured usage', async () => {
      const run = jest.fn().mockResolvedValue({ tokens: 1 });

      await service.meterOrchestrationCall(
        {
          userId: 'u1',
          requestId: 'r1',
          provider: 'local-ollama',
          model: 'qwen3:1.7b',
          workflow: 'pipeline',
          promptText: 'a prompt',
        },
        run,
        () => ({ promptTokens: 30, completionTokens: 12 }),
      );

      // The runtime tag is rewritten to the connector provider auth knows;
      // sending `local-ollama` would ask the meter about a provider it has
      // never heard of and fail closed on the operator's own hardware.
      expect(meter.reserve.mock.calls[0]?.[0]).toMatchObject({
        provider: 'OLLAMA',
        surface: PaygSurface.ORCHESTRATION,
        workflow: 'pipeline',
      });
      expect(run).toHaveBeenCalledWith(hold);
      // Third argument is the tool/search/image call counts. An orchestration
      // lab reports none, so it is genuinely absent rather than zeroed — the
      // meter's own default fills it in.
      expect(meter.finalize).toHaveBeenCalledWith(
        hold,
        {
          promptTokens: 30,
          completionTokens: 12,
          cachedPromptTokens: 0,
          reasoningTokens: 0,
        },
        undefined,
      );
      expect(meter.release).not.toHaveBeenCalled();
    });

    it('gives the hold back when the call throws, and re-raises', async () => {
      const failure = new Error('ollama unreachable');
      await expect(
        service.meterOrchestrationCall(
          {
            userId: 'u1',
            requestId: 'r1',
            provider: 'local-ollama',
            model: 'qwen3:1.7b',
            workflow: 'verifier',
            promptText: 'a prompt',
          },
          async () => {
            throw failure;
          },
          () => ({ promptTokens: 0, completionTokens: 0 }),
        ),
      ).rejects.toBe(failure);

      expect(meter.release).toHaveBeenCalledWith(hold, 'PROVIDER_ERROR');
      expect(meter.finalize).not.toHaveBeenCalled();
    });

    it('reserves against a defensive default when no ceiling was asked for', async () => {
      await service.meterOrchestrationCall(
        {
          userId: 'u1',
          requestId: 'r1',
          provider: 'local-ollama',
          model: 'qwen3:1.7b',
          workflow: 'best-of-n',
          promptText: 'a prompt',
        },
        async () => ({}),
        () => ({ promptTokens: 1, completionTokens: 1 }),
      );
      const requested = meter.reserve.mock.calls[0]?.[0] as { requestedMaxOutputTokens: number };
      // Never 0 - that would claim the caller wanted no output at all.
      expect(requested.requestedMaxOutputTokens).toBeGreaterThan(0);
    });
  });
});

describe('PAYG surface map', () => {
  it('covers every token-ledger context, so no paid call can be anonymous', () => {
    for (const context of Object.values(TokenLedgerContext)) {
      expect(PAYG_SURFACE_BY_TOKEN_CONTEXT[context]).toBeDefined();
    }
  });

  it('routes all nine orchestration labs to the ORCHESTRATION surface', () => {
    const labs = [
      TokenLedgerContext.CONSENSUS,
      TokenLedgerContext.ESCALATION_CHAIN,
      TokenLedgerContext.BEST_OF_N,
      TokenLedgerContext.COST_ENSEMBLE,
      TokenLedgerContext.ROLE_PACK,
      TokenLedgerContext.PIPELINE,
      TokenLedgerContext.TASK_DECOMPOSITION,
      TokenLedgerContext.VERIFY,
      TokenLedgerContext.REPAIR,
    ];
    expect(labs).toHaveLength(9);
    for (const lab of labs) {
      expect(PAYG_SURFACE_BY_TOKEN_CONTEXT[lab]).toBe(PaygSurface.ORCHESTRATION);
    }
  });
});
