import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CreditFallbackNotice } from '@/components/chat/credit-fallback-notice';
import { CreditFallbackReason } from '@/enums';
import { en } from '@/lib/i18n/locales/en';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';
import type { CreditFallbackInfo } from '@/types';
import { readCreditFallback } from '@/utilities/picked-model-fallback.utility';

const t = (key: string, params?: Record<string, string | number>): string =>
  resolveTranslation(en, key, params);

const info = (reason: CreditFallbackReason): CreditFallbackInfo => ({
  originalProvider: 'OPENAI',
  originalModel: 'GPT 4.1 nano',
  reason,
});

describe('CreditFallbackNotice', () => {
  it.each([
    [
      CreditFallbackReason.CreditExhausted,
      'Your connector credit is used up, so GLM 5.2 answered instead.',
    ],
    [
      CreditFallbackReason.FreeAllowanceExhausted,
      'You have used all your free credit-model requests this month',
    ],
    [
      CreditFallbackReason.PromptTooExpensive,
      'GPT 4.1 nano costs more than the credit you have left',
    ],
  ] as const)('says why for %s and that no credit was used', (reason, expected) => {
    render(<CreditFallbackNotice info={info(reason)} answeredModel="GLM 5.2" t={t} />);

    const notice = screen.getByTestId('credit-fallback-notice');
    expect(notice).toHaveTextContent(expected);
    expect(notice).toHaveTextContent('No credit was used.');
    expect(notice).toHaveTextContent('Add credit or upgrade your plan to use GPT 4.1 nano again.');
  });
});

describe('readCreditFallback', () => {
  it('reads a stored notice', () => {
    expect(
      readCreditFallback({
        creditFallback: {
          originalProvider: 'OPENAI',
          originalModel: 'gpt-4.1-nano',
          reason: 'CREDIT_EXHAUSTED',
        },
      }),
    ).toEqual({
      originalProvider: 'OPENAI',
      originalModel: 'gpt-4.1-nano',
      reason: 'CREDIT_EXHAUSTED',
    });
  });

  it.each([
    [null],
    [{}],
    [{ creditFallback: 'x' }],
    [{ creditFallback: { originalProvider: 'OPENAI', originalModel: 'm', reason: 'NOPE' } }],
    [{ creditFallback: { originalProvider: '', originalModel: 'm', reason: 'CREDIT_EXHAUSTED' } }],
  ])('ignores malformed metadata %#', (metadata) => {
    expect(readCreditFallback(metadata as Record<string, unknown> | null)).toBeNull();
  });
});
