import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatLimitNoticeCard } from '@/components/chat/chat-limit-notice-card';
import { ApiErrorCode } from '@/enums';
import { resolveChatLimitNoticeFromCode } from '@/utilities/chat-limit-notice.utility';

const walletState: { freeAllowance: { limit: number | null } | null } = { freeAllowance: null };

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, number>) =>
      params === undefined ? key : `${key}:${String(params['limit'])}`,
  }),
}));

vi.mock('@/hooks/credit/use-credit-wallet', () => ({
  useCreditWallet: () => ({ wallet: { freeAllowance: walletState.freeAllowance } }),
}));

vi.mock('@/components/billing/credit-dual-consumption-notice', () => ({
  CreditDualConsumptionNotice: () => null,
}));

const freeAllowanceNotice = () => {
  const notice = resolveChatLimitNoticeFromCode(ApiErrorCode.PAYG_FREE_ALLOWANCE_EXHAUSTED);
  if (notice === null) {
    throw new Error('expected a notice');
  }
  return notice;
};

describe('ChatLimitNoticeCard: spent free credit-model requests', () => {
  beforeEach(() => {
    walletState.freeAllowance = null;
  });

  it('offers BOTH an upgrade and an add-credit button', () => {
    render(<ChatLimitNoticeCard notice={freeAllowanceNotice()} />);

    expect(screen.getByText('chat.limits.paygFreeAllowanceExhaustedTitle')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'chat.limits.upgradeCta' })).toHaveAttribute(
      'href',
      '/plan',
    );
    expect(screen.getByRole('link', { name: 'chat.limits.addCreditCta' })).toHaveAttribute(
      'href',
      '/plan?topup=open',
    );
  });

  it('says how many requests the plan gave when the wallet knows the number', () => {
    walletState.freeAllowance = { limit: 15 };

    render(<ChatLimitNoticeCard notice={freeAllowanceNotice()} />);

    expect(
      screen.getByText('chat.limits.paygFreeAllowanceExhaustedBodyWithLimit:15'),
    ).toBeInTheDocument();
  });

  it('falls back to the sentence without a number while the wallet is unknown', () => {
    render(<ChatLimitNoticeCard notice={freeAllowanceNotice()} />);

    expect(screen.getByText('chat.limits.paygFreeAllowanceExhaustedBody')).toBeInTheDocument();
  });

  it('does not invent a number for an unlimited plan', () => {
    walletState.freeAllowance = { limit: null };

    render(<ChatLimitNoticeCard notice={freeAllowanceNotice()} />);

    expect(screen.getByText('chat.limits.paygFreeAllowanceExhaustedBody')).toBeInTheDocument();
  });
});

describe('ChatLimitNoticeCard: an empty wallet keeps its single button', () => {
  it('shows only add credit for PAYG_CREDIT_EXHAUSTED', () => {
    const notice = resolveChatLimitNoticeFromCode(ApiErrorCode.PAYG_CREDIT_EXHAUSTED);
    if (notice === null) {
      throw new Error('expected a notice');
    }

    render(<ChatLimitNoticeCard notice={notice} />);

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'chat.limits.addCreditCta' })).toBeInTheDocument();
  });
});
