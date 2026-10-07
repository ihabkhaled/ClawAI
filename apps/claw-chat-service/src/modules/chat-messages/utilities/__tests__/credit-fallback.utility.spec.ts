import { HttpStatus } from '@nestjs/common';

import { BusinessException } from '../../../../common/errors';
import { CreditFallbackReason } from '../../enums/credit-fallback-reason.enum';
import {
  creditFallbackPart,
  creditFallbackReason,
  noteCreditRefusal,
  refusalSparesCheaperModels,
  skipsMeteredAfterRefusal,
} from '../credit-fallback.utility';

const refusal = (code: string) =>
  new BusinessException('refused', code, HttpStatus.PAYMENT_REQUIRED);

describe('credit fallback', () => {
  it.each([
    ['PAYG_CREDIT_EXHAUSTED', CreditFallbackReason.CREDIT_EXHAUSTED],
    ['PAYG_FREE_ALLOWANCE_EXHAUSTED', CreditFallbackReason.FREE_ALLOWANCE_EXHAUSTED],
    ['PAYG_PROMPT_TOO_EXPENSIVE', CreditFallbackReason.PROMPT_TOO_EXPENSIVE],
    ['PAYG_MODEL_NOT_IN_FREE_ALLOWANCE', CreditFallbackReason.MODEL_NOT_IN_FREE_ALLOWANCE],
    ['SOMETHING_ELSE', CreditFallbackReason.CREDIT_EXHAUSTED],
  ])('maps %s to %s', (code, reason) => {
    expect(creditFallbackReason(refusal(code))).toBe(reason);
  });

  it('keeps only the first refusal of a turn', () => {
    const first = noteCreditRefusal(
      null,
      { provider: 'OPENAI', model: 'gpt-4.1-nano' },
      refusal('PAYG_CREDIT_EXHAUSTED'),
    );
    const second = noteCreditRefusal(
      first,
      { provider: 'GROK', model: 'grok-4' },
      refusal('PAYG_PROMPT_TOO_EXPENSIVE'),
    );

    expect(second).toBe(first);
    expect(second.originalModel).toBe('gpt-4.1-nano');
  });

  it('tells the user only when an included model answered', () => {
    const record = noteCreditRefusal(
      null,
      { provider: 'OPENAI', model: 'gpt-4.1-nano' },
      refusal('PAYG_CREDIT_EXHAUSTED'),
    );

    expect(creditFallbackPart(record, { provider: 'OLLAMA' }).creditFallback).toEqual(record);
    expect(creditFallbackPart(record, { provider: 'local-ollama' }).creditFallback).toEqual(record);
    expect(creditFallbackPart(record, { provider: 'GEMINI' })).toEqual({});
    expect(creditFallbackPart(null, { provider: 'OLLAMA' })).toEqual({});
  });

  it('leaves cheaper credit models in play for a dear prompt or a model above the price limit', () => {
    expect(refusalSparesCheaperModels(CreditFallbackReason.PROMPT_TOO_EXPENSIVE)).toBe(true);
    expect(refusalSparesCheaperModels(CreditFallbackReason.MODEL_NOT_IN_FREE_ALLOWANCE)).toBe(true);
    expect(refusalSparesCheaperModels(CreditFallbackReason.CREDIT_EXHAUSTED)).toBe(false);
    expect(refusalSparesCheaperModels(CreditFallbackReason.FREE_ALLOWANCE_EXHAUSTED)).toBe(false);
  });

  it('skips credit models only once the credit is gone', () => {
    expect(skipsMeteredAfterRefusal(true, { provider: 'GEMINI' })).toBe(true);
    expect(skipsMeteredAfterRefusal(true, { provider: 'OLLAMA' })).toBe(false);
    expect(skipsMeteredAfterRefusal(false, { provider: 'GEMINI' })).toBe(false);
  });
});
