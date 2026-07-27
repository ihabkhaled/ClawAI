import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RefundTransactionCard } from '@/components/admin/refunds/refund-transaction-card';
import type { AdminRefundableTransaction } from '@/types';

const transaction: AdminRefundableTransaction = {
  id: 'charge-1',
  userId: 'user-1',
  subscriptionId: 'subscription-1',
  gateway: 'PAYPAL',
  capturedAmountMinor: 10_000,
  remainingAmountMinor: 7_500,
  currency: 'USD',
  capturedAt: '2026-07-27T10:00:00.000Z',
};

describe('RefundTransactionCard', () => {
  it('shows the captured and remaining ledger values', () => {
    render(
      <RefundTransactionCard
        transaction={transaction}
        isPending={false}
        onRefund={vi.fn()}
        t={(key) => key}
      />,
    );

    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$75.00')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
  });

  it('submits an exact minor-unit amount and server contract', async () => {
    const onRefund = vi.fn();
    const user = userEvent.setup();
    render(
      <RefundTransactionCard
        transaction={transaction}
        isPending={false}
        onRefund={onRefund}
        t={(key) => key}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'adminRefunds.refundAction' }));
    await user.type(screen.getByLabelText('adminRefunds.amount'), '25.50');
    await user.type(screen.getByLabelText('adminRefunds.reason'), 'Customer request');
    await user.click(screen.getByRole('button', { name: 'adminRefunds.confirm' }));

    expect(onRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentTransactionId: 'charge-1',
        amountMinor: 2_550,
        reason: 'Customer request',
        idempotencyKey: expect.stringContaining('refund:charge-1:'),
      }),
    );
  });

  it('blocks an amount above the remaining balance', async () => {
    const onRefund = vi.fn();
    const user = userEvent.setup();
    render(
      <RefundTransactionCard
        transaction={transaction}
        isPending={false}
        onRefund={onRefund}
        t={(key) => key}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'adminRefunds.refundAction' }));
    await user.type(screen.getByLabelText('adminRefunds.amount'), '80');
    await user.type(screen.getByLabelText('adminRefunds.reason'), 'Customer request');
    await user.click(screen.getByRole('button', { name: 'adminRefunds.confirm' }));

    expect(screen.getByRole('alert')).toHaveTextContent('adminRefunds.invalidAmount');
    expect(onRefund).not.toHaveBeenCalled();
  });
});
