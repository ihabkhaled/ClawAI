import { BillingInterval, InvoiceStatus, SubscriptionStatus } from '@claw/shared-types';

import { type InvoiceRepository } from '../../../subscriptions/repositories/invoice.repository';
import { type SubscriptionRepository } from '../../../subscriptions/repositories/subscription.repository';
import { buildInvoice, buildSubscription } from '../../__tests__/admin-user-billing.fixtures';
import { ADMIN_USER_RECENT_INVOICE_LIMIT } from '../../constants/admin-user-billing.constants';
import { AdminUserBillingService } from '../admin-user-billing.service';

type SubscriptionMocks = {
  findActiveByUserId: jest.Mock;
  findAllByUserId: jest.Mock;
};

type InvoiceMocks = {
  listPaidForUser: jest.Mock;
  listForUser: jest.Mock;
};

function buildService(): {
  service: AdminUserBillingService;
  subscriptions: SubscriptionMocks;
  invoices: InvoiceMocks;
} {
  const subscriptions: SubscriptionMocks = {
    findActiveByUserId: jest.fn().mockResolvedValue(null),
    findAllByUserId: jest.fn().mockResolvedValue([]),
  };
  const invoices: InvoiceMocks = {
    listPaidForUser: jest.fn().mockResolvedValue([]),
    listForUser: jest.fn().mockResolvedValue([]),
  };
  const subscriptionRepository: Partial<SubscriptionRepository> = subscriptions;
  const invoiceRepository: Partial<InvoiceRepository> = invoices;
  return {
    service: new AdminUserBillingService(
      subscriptionRepository as SubscriptionRepository,
      invoiceRepository as InvoiceRepository,
    ),
    subscriptions,
    invoices,
  };
}

const NOW = new Date('2026-09-06T12:00:00.000Z');

describe('AdminUserBillingService', () => {
  it('scopes every read by the requested user id', async () => {
    const { service, subscriptions, invoices } = buildService();

    await service.getSubscriptionStatistics('user_1', NOW);

    expect(subscriptions.findActiveByUserId).toHaveBeenCalledWith('user_1');
    expect(subscriptions.findAllByUserId).toHaveBeenCalledWith('user_1');
    expect(invoices.listPaidForUser).toHaveBeenCalledWith('user_1');
    expect(invoices.listForUser).toHaveBeenCalledWith('user_1', ADMIN_USER_RECENT_INVOICE_LIMIT);
  });

  it('bounds the recent-invoice table with the named cap', async () => {
    const { service, invoices } = buildService();

    await service.getSubscriptionStatistics('user_1', NOW);

    expect(invoices.listForUser).toHaveBeenCalledWith('user_1', 24);
  });

  it('returns a null subscription for a free account instead of failing', async () => {
    const { service } = buildService();

    const statistics = await service.getSubscriptionStatistics('user_free', NOW);

    expect(statistics.subscription).toBeNull();
    expect(statistics.periodLengthMonths).toBeNull();
    expect(statistics.nextRenewalAt).toBeNull();
    expect(statistics.monthsPaid).toBe(0);
    expect(statistics.totalPaidMinor).toEqual([]);
    expect(statistics.subscriptionHistory).toEqual([]);
    expect(statistics.recentInvoices).toEqual([]);
    expect(statistics.generatedAt).toBe('2026-09-06T12:00:00.000Z');
    expect(statistics.userId).toBe('user_free');
  });

  it('projects the current subscription and derives its renewal date', async () => {
    const { service, subscriptions } = buildService();
    const current = buildSubscription({ status: SubscriptionStatus.ACTIVE });
    subscriptions.findActiveByUserId.mockResolvedValue(current);
    subscriptions.findAllByUserId.mockResolvedValue([current]);

    const statistics = await service.getSubscriptionStatistics('user_1', NOW);

    expect(statistics.subscription?.id).toBe('sub_1');
    expect(statistics.subscription?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(statistics.subscription?.amountMinor).toBe(500);
    expect(statistics.periodLengthMonths).toBe(1);
    expect(statistics.nextRenewalAt).toBe('2026-09-06T18:45:54.539Z');
  });

  it('withholds the renewal date from a subscription that will not renew', async () => {
    const { service, subscriptions } = buildService();
    const current = buildSubscription({
      status: SubscriptionStatus.CANCEL_AT_PERIOD_END,
      cancelAtPeriodEnd: true,
    });
    subscriptions.findActiveByUserId.mockResolvedValue(current);

    const statistics = await service.getSubscriptionStatistics('user_1', NOW);

    expect(statistics.subscription?.currentPeriodEnd).toBe('2026-09-06T18:45:54.539Z');
    expect(statistics.nextRenewalAt).toBeNull();
  });

  it('sums months paid and money paid from the PAID invoices only', async () => {
    const { service, subscriptions, invoices } = buildService();
    const yearly = buildSubscription({ id: 'sub_y', billingInterval: BillingInterval.YEARLY });
    subscriptions.findAllByUserId.mockResolvedValue([yearly]);
    invoices.listPaidForUser.mockResolvedValue([
      buildInvoice({
        id: 'inv_a',
        subscriptionId: 'sub_y',
        periodStart: new Date('2026-01-01T00:00:00.000Z'),
        periodEnd: new Date('2027-01-01T00:00:00.000Z'),
        amountPaidMinor: 5_000,
      }),
      buildInvoice({
        id: 'inv_b',
        subscriptionId: 'sub_y',
        periodStart: null,
        periodEnd: null,
        amountPaidMinor: 5_000,
      }),
    ]);

    const statistics = await service.getSubscriptionStatistics('user_1', NOW);

    // 12 from the invoice's own period, 12 more from the subscription interval
    // the periodless invoice was issued against.
    expect(statistics.monthsPaid).toBe(24);
    expect(statistics.totalPaidMinor).toEqual([{ currency: 'USD', amountMinor: 10_000 }]);
  });

  it('never folds two currencies into one total', async () => {
    const { service, invoices } = buildService();
    invoices.listPaidForUser.mockResolvedValue([
      buildInvoice({ id: 'a', currency: 'USD', amountPaidMinor: 500 }),
      buildInvoice({ id: 'b', currency: 'EGP', amountPaidMinor: 25_000 }),
    ]);

    const statistics = await service.getSubscriptionStatistics('user_1', NOW);

    expect(statistics.totalPaidMinor).toEqual([
      { currency: 'EGP', amountMinor: 25_000 },
      { currency: 'USD', amountMinor: 500 },
    ]);
  });

  it('returns the whole subscription history, terminal rows included', async () => {
    const { service, subscriptions } = buildService();
    subscriptions.findAllByUserId.mockResolvedValue([
      buildSubscription({ id: 'sub_3', status: SubscriptionStatus.REFUNDED }),
      buildSubscription({ id: 'sub_2', status: SubscriptionStatus.CANCELLED }),
      buildSubscription({ id: 'sub_1', status: SubscriptionStatus.CANCELLED }),
    ]);

    const statistics = await service.getSubscriptionStatistics('user_1', NOW);

    expect(statistics.subscriptionHistory.map((entry) => entry.id)).toEqual([
      'sub_3',
      'sub_2',
      'sub_1',
    ]);
    expect(statistics.subscriptionHistory[0]?.status).toBe(SubscriptionStatus.REFUNDED);
  });

  it('lists recent invoices of every status, not only the paid ones', async () => {
    const { service, invoices } = buildService();
    invoices.listForUser.mockResolvedValue([
      buildInvoice({ id: 'inv_open', status: InvoiceStatus.OPEN, paidAt: null }),
      buildInvoice({ id: 'inv_paid', status: InvoiceStatus.PAID }),
    ]);

    const statistics = await service.getSubscriptionStatistics('user_1', NOW);

    expect(statistics.recentInvoices.map((entry) => entry.status)).toEqual([
      InvoiceStatus.OPEN,
      InvoiceStatus.PAID,
    ]);
  });

  it('fails closed on a status the enum does not cover rather than publishing it', async () => {
    // status is a plain String column. Parsing rather than casting is what
    // stops an unrecognised value reaching an admin screen typed as a
    // SubscriptionStatus it is not.
    const { service, subscriptions } = buildService();
    subscriptions.findActiveByUserId.mockResolvedValue(
      buildSubscription({ status: 'NOT_A_REAL_STATUS' }),
    );

    await expect(service.getSubscriptionStatistics('user_1', NOW)).rejects.toThrow();
  });

  it('defaults the generated timestamp to now when the caller passes none', async () => {
    const { service } = buildService();

    const statistics = await service.getSubscriptionStatistics('user_1');

    expect(Number.isNaN(Date.parse(statistics.generatedAt))).toBe(false);
  });
});
