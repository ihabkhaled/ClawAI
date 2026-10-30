import type { ModelCostRates } from '@claw/shared-types';

import type { PlanCallLimits } from '../../types/plan-call-limits.types';
import { applyPlanCallLimits } from '../plan-call-limits.utility';

// claude-sonnet-5 list price (seed v13): $2 in, $10 out per million tokens.
const SONNET = {
  inputPerMillionMicroUsd: 2_000_000,
  outputPerMillionMicroUsd: 10_000_000,
  cachedInputPerMillionMicroUsd: 200_000,
  reasoningPerMillionMicroUsd: 10_000_000,
} as ModelCostRates;

const NONE: PlanCallLimits = { maxInputTokens: null, maxOutputTokens: null, maxCostMicroUsd: null };
const request = (promptTokens: number, requestedMaxOutputTokens = 30_000) => ({
  promptTokens,
  cachedPromptTokens: 0,
  requestedMaxOutputTokens,
});

describe('applyPlanCallLimits', () => {
  it('changes nothing when the plan sets no limit', () => {
    expect(applyPlanCallLimits(NONE, request(500_000), SONNET)).toEqual({
      status: 'WITHIN',
      maxOutputTokens: 30_000,
    });
  });

  it('refuses a prompt longer than the plan accepts, before any pricing', () => {
    const limits = { ...NONE, maxInputTokens: 16_000 };
    expect(applyPlanCallLimits(limits, request(16_001), null)).toEqual({
      status: 'REFUSED',
      reason: 'INPUT_TOO_LONG',
    });
    expect(applyPlanCallLimits(limits, request(16_000), null).status).toBe('WITHIN');
  });

  it('clamps the output ceiling to the plan output limit', () => {
    const limits = { ...NONE, maxOutputTokens: 2_000 };
    expect(applyPlanCallLimits(limits, request(1_000), SONNET)).toEqual({
      status: 'WITHIN',
      maxOutputTokens: 2_000,
    });
  });

  it('never raises a smaller requested ceiling', () => {
    const limits = { ...NONE, maxOutputTokens: 2_000 };
    expect(applyPlanCallLimits(limits, request(1_000, 500), SONNET)).toEqual({
      status: 'WITHIN',
      maxOutputTokens: 500,
    });
  });

  it('shortens the answer so the worst case fits the dollar cap', () => {
    // Free plan: $0.03 per call. 5,000 prompt tokens cost $0.01, leaving $0.02,
    // which pays for 2,000 output tokens at $10/M.
    const limits = { ...NONE, maxCostMicroUsd: 30_000 };
    expect(applyPlanCallLimits(limits, request(5_000), SONNET)).toEqual({
      status: 'WITHIN',
      maxOutputTokens: 2_000,
    });
  });

  it('refuses when the prompt alone costs more than the cap', () => {
    // 16,000 prompt tokens cost $0.032, over the $0.03 cap.
    const limits = { ...NONE, maxCostMicroUsd: 30_000 };
    expect(applyPlanCallLimits(limits, request(16_000), SONNET)).toEqual({
      status: 'REFUSED',
      reason: 'CALL_TOO_EXPENSIVE',
    });
  });

  it('refuses when what is left cannot pay for a viable answer', () => {
    // $0.03 minus a $0.0295 prompt leaves too little for the minimum answer.
    const limits = { ...NONE, maxCostMicroUsd: 30_000 };
    expect(applyPlanCallLimits(limits, request(14_750), SONNET).status).toBe('REFUSED');
  });

  it('applies only the token limits when the model has no usable price', () => {
    const limits = { maxInputTokens: 16_000, maxOutputTokens: 2_000, maxCostMicroUsd: 30_000 };
    expect(applyPlanCallLimits(limits, request(10_000), null)).toEqual({
      status: 'WITHIN',
      maxOutputTokens: 2_000,
    });
  });

  it('takes the smaller of the output limit and the dollar clamp', () => {
    const limits = { maxInputTokens: null, maxOutputTokens: 1_000, maxCostMicroUsd: 30_000 };
    expect(applyPlanCallLimits(limits, request(5_000), SONNET)).toEqual({
      status: 'WITHIN',
      maxOutputTokens: 1_000,
    });
  });

  it('treats an output limit of 0 as refuse, not as unlimited', () => {
    const limits = { ...NONE, maxOutputTokens: 0 };
    expect(applyPlanCallLimits(limits, request(10), SONNET).status).toBe('REFUSED');
  });

  it('prices cached prompt tokens at the cache rate, so a cached prompt fits', () => {
    const limits = { ...NONE, maxCostMicroUsd: 30_000 };
    const cached = { ...request(16_000), cachedPromptTokens: 16_000 };
    expect(applyPlanCallLimits(limits, cached, SONNET).status).toBe('WITHIN');
  });
});
