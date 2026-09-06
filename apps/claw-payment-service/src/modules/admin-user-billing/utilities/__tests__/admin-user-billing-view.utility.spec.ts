import { BillingInterval, InvoiceStatus, SubscriptionStatus } from '@claw/shared-types';

import { buildInvoice, buildSubscription } from '../../__tests__/admin-user-billing.fixtures';
import {
  calendarMonthsBetween,
  periodMonthsBySubscriptionId,
  resolveInvoicePeriodMonths,
  resolveNextRenewalAt,
  resolvePeriodLengthMonths,
  sumMonthsPaid,
  sumPaidTotalsByCurrency,
  toAdminInvoiceEntry,
  toAdminSubscriptionHistoryEntry,
  toAdminSubscriptionSnapshot,
  toAdminUserSubscriptionStatisticsDraft,
} from '../admin-user-billing-view.utility';

describe('resolvePeriodLengthMonths', () => {
  it.each([
    [BillingInterval.MONTHLY, 1],
    [BillingInterval.QUARTERLY, 3],
    [BillingInterval.SEMIANNUAL, 6],
    [BillingInterval.YEARLY, 12],
  ])('maps %s to %i months', (interval, months) => {
    expect(resolvePeriodLengthMonths(interval)).toBe(months);
  });

  it('falls back to one month for a value the column could hold but the enum does not', () => {
    // billingInterval is a plain String column, so this is reachable data, not
    // a hypothetical. Returning undefined here would poison every sum.
    expect(resolvePeriodLengthMonths('FORTNIGHTLY')).toBe(1);
  });
});

describe('resolveNextRenewalAt', () => {
  it('reports the period end for an ACTIVE subscription that will renew', () => {
    expect(resolveNextRenewalAt(buildSubscription())).toBe('2026-09-06T18:45:54.539Z');
  });

  it('reports null when the subscription is set to stop at period end', () => {
    // currentPeriodEnd still has a value here — it is when access stops, not
    // when money moves. Showing it as a renewal date would tell an operator a
    // churned customer is about to pay again.
    const subscription = buildSubscription({
      status: SubscriptionStatus.CANCEL_AT_PERIOD_END,
      cancelAtPeriodEnd: true,
    });
    expect(resolveNextRenewalAt(subscription)).toBeNull();
  });

  it('still reports a renewal for CANCEL_AT_PERIOD_END while the flag is unset', () => {
    const subscription = buildSubscription({
      status: SubscriptionStatus.CANCEL_AT_PERIOD_END,
      cancelAtPeriodEnd: false,
    });
    expect(resolveNextRenewalAt(subscription)).toBe('2026-09-06T18:45:54.539Z');
  });

  it('reports the period end for PAST_DUE, which still carries entitlement', () => {
    const subscription = buildSubscription({ status: SubscriptionStatus.PAST_DUE });
    expect(resolveNextRenewalAt(subscription)).toBe('2026-09-06T18:45:54.539Z');
  });

  it.each([
    SubscriptionStatus.CANCELLED,
    SubscriptionStatus.EXPIRED,
    SubscriptionStatus.REFUNDED,
    SubscriptionStatus.CHARGEBACK,
    SubscriptionStatus.SUSPENDED,
    SubscriptionStatus.PAUSED,
    SubscriptionStatus.PENDING,
    SubscriptionStatus.INCOMPLETE,
  ])('reports null for %s, which carries no entitlement', (status) => {
    expect(resolveNextRenewalAt(buildSubscription({ status }))).toBeNull();
  });
});

describe('calendarMonthsBetween', () => {
  it('counts whole months across a year boundary', () => {
    expect(
      calendarMonthsBetween(new Date('2025-11-15T00:00:00.000Z'), new Date('2026-02-15T00:00:00Z')),
    ).toBe(3);
  });

  it('counts a clamped month end as one month, not as 28 days of one', () => {
    // addCalendarMonths wrote this end date: 31 Jan + 1 month clamps to 28 Feb.
    // A day count would score it below a full month and truncate to zero.
    expect(
      calendarMonthsBetween(new Date('2026-01-31T00:00:00.000Z'), new Date('2026-02-28T00:00:00Z')),
    ).toBe(1);
  });

  it('counts a yearly period as twelve', () => {
    expect(
      calendarMonthsBetween(new Date('2026-03-01T00:00:00.000Z'), new Date('2027-03-01T00:00:00Z')),
    ).toBe(12);
  });
});

describe('resolveInvoicePeriodMonths', () => {
  it('prefers the invoice period over the subscription interval', () => {
    // The document is immutable, so its own period stays correct after the
    // subscription later switches interval.
    const invoice = buildInvoice({
      periodStart: new Date('2026-01-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-01T00:00:00.000Z'),
    });
    expect(resolveInvoicePeriodMonths(invoice, 1)).toBe(6);
  });

  it('falls back to the subscription interval when the invoice carries no period', () => {
    const invoice = buildInvoice({ periodStart: null, periodEnd: null });
    expect(resolveInvoicePeriodMonths(invoice, 12)).toBe(12);
  });

  it('falls back when only one end of the period is present', () => {
    const invoice = buildInvoice({ periodEnd: null });
    expect(resolveInvoicePeriodMonths(invoice, 3)).toBe(3);
  });

  it('counts a sub-month period as one month rather than zero', () => {
    // A proration or mid-cycle correction. The customer did pay for a period;
    // rounding it away would report a paying account as having paid nothing.
    const invoice = buildInvoice({
      periodStart: new Date('2026-01-05T00:00:00.000Z'),
      periodEnd: new Date('2026-01-20T00:00:00.000Z'),
    });
    expect(resolveInvoicePeriodMonths(invoice, 1)).toBe(1);
  });
});

describe('sumMonthsPaid', () => {
  it('sums each paid invoice period, so one yearly equals twelve monthlies', () => {
    const yearly = [
      buildInvoice({
        id: 'inv_year',
        periodStart: new Date('2026-01-01T00:00:00.000Z'),
        periodEnd: new Date('2027-01-01T00:00:00.000Z'),
      }),
    ];
    const monthlies = Array.from({ length: 12 }, (_value, index) =>
      buildInvoice({
        id: `inv_${String(index)}`,
        periodStart: new Date(Date.UTC(2026, index, 1)),
        periodEnd: new Date(Date.UTC(2026, index + 1, 1)),
      }),
    );
    const months = new Map<string, number>();

    expect(sumMonthsPaid(yearly, months)).toBe(12);
    expect(sumMonthsPaid(monthlies, months)).toBe(12);
  });

  it('uses the interval of the subscription the periodless invoice belongs to', () => {
    // Not the user's current interval: the invoice was issued against an older
    // subscription, and that is the cadence it was actually paid at.
    const invoice = buildInvoice({
      subscriptionId: 'sub_old',
      periodStart: null,
      periodEnd: null,
    });
    const months = new Map([
      ['sub_old', 12],
      ['sub_new', 1],
    ]);
    expect(sumMonthsPaid([invoice], months)).toBe(12);
  });

  it('falls back to one month for an invoice bound to no subscription', () => {
    const invoice = buildInvoice({ subscriptionId: null, periodStart: null, periodEnd: null });
    expect(sumMonthsPaid([invoice], new Map())).toBe(1);
  });

  it('falls back to one month when the subscription is not in the history map', () => {
    const invoice = buildInvoice({
      subscriptionId: 'sub_missing',
      periodStart: null,
      periodEnd: null,
    });
    expect(sumMonthsPaid([invoice], new Map())).toBe(1);
  });

  it('is zero for an account that has paid nothing', () => {
    expect(sumMonthsPaid([], new Map())).toBe(0);
  });
});

describe('sumPaidTotalsByCurrency', () => {
  it('keeps every currency in its own integer total', () => {
    const totals = sumPaidTotalsByCurrency([
      buildInvoice({ id: 'a', currency: 'USD', amountPaidMinor: 500 }),
      buildInvoice({ id: 'b', currency: 'USD', amountPaidMinor: 10 }),
      buildInvoice({ id: 'c', currency: 'EGP', amountPaidMinor: 25_000 }),
    ]);

    // Never one blended number: 510 USD plus 25000 EGP means nothing.
    expect(totals).toEqual([
      { currency: 'EGP', amountMinor: 25_000 },
      { currency: 'USD', amountMinor: 510 },
    ]);
  });

  it('returns an empty list rather than a zero total when nothing was paid', () => {
    expect(sumPaidTotalsByCurrency([])).toEqual([]);
  });
});

describe('periodMonthsBySubscriptionId', () => {
  it('keys each subscription by its own interval', () => {
    const map = periodMonthsBySubscriptionId([
      buildSubscription({ id: 'sub_a', billingInterval: BillingInterval.YEARLY }),
      buildSubscription({ id: 'sub_b', billingInterval: BillingInterval.QUARTERLY }),
    ]);
    expect(map.get('sub_a')).toBe(12);
    expect(map.get('sub_b')).toBe(3);
  });
});

describe('projections', () => {
  it('never publishes a gateway identifier or the concurrency version', () => {
    const snapshot = toAdminSubscriptionSnapshot(
      buildSubscription({
        encryptedGatewaySubscriptionId: 'ciphertext',
        gatewaySubscriptionLookupHash: 'blind_index',
        version: 7,
      }),
    );

    expect(Object.keys(snapshot)).not.toContain('encryptedGatewaySubscriptionId');
    expect(Object.keys(snapshot)).not.toContain('gatewaySubscriptionLookupHash');
    expect(Object.keys(snapshot)).not.toContain('version');
    expect(Object.keys(snapshot)).not.toContain('billingCustomerId');
  });

  it('serialises every subscription date as ISO-8601 or null', () => {
    const snapshot = toAdminSubscriptionSnapshot(
      buildSubscription({
        cancelledAt: new Date('2026-08-06T18:59:25.870Z'),
        pastDueAt: null,
        gracePeriodEndsAt: null,
        scheduledEffectiveAt: new Date('2026-09-06T18:45:54.539Z'),
        scheduledPlanSlug: 'test',
      }),
    );

    expect(snapshot.cancelledAt).toBe('2026-08-06T18:59:25.870Z');
    expect(snapshot.pastDueAt).toBeNull();
    expect(snapshot.gracePeriodEndsAt).toBeNull();
    expect(snapshot.scheduledEffectiveAt).toBe('2026-09-06T18:45:54.539Z');
    expect(snapshot.scheduledPlanSlug).toBe('test');
  });

  it('projects a history row without the gateway columns', () => {
    const entry = toAdminSubscriptionHistoryEntry(
      buildSubscription({ id: 'sub_2', status: SubscriptionStatus.CANCELLED, amountMinor: 10 }),
    );
    expect(entry).toEqual({
      id: 'sub_2',
      planSlug: 'starter',
      status: SubscriptionStatus.CANCELLED,
      billingInterval: BillingInterval.MONTHLY,
      amountMinor: 10,
      currency: 'USD',
      createdAt: '2026-08-06T18:45:54.556Z',
      currentPeriodStart: '2026-08-06T18:45:54.539Z',
      currentPeriodEnd: '2026-09-06T18:45:54.539Z',
      cancelledAt: null,
    });
  });

  it('projects an invoice with both integer money fields and nullable periods', () => {
    const entry = toAdminInvoiceEntry(
      buildInvoice({ status: InvoiceStatus.OPEN, paidAt: null, periodStart: null, periodEnd: null }),
    );
    expect(entry).toEqual({
      id: 'inv_1',
      number: 'CLAW-00000001',
      status: InvoiceStatus.OPEN,
      currency: 'USD',
      totalMinor: 500,
      amountPaidMinor: 500,
      periodStart: null,
      periodEnd: null,
      issuedAt: '2026-08-06T18:45:54.809Z',
      paidAt: null,
    });
  });
});

describe('toAdminUserSubscriptionStatisticsDraft', () => {
  it('reports a free account as a null subscription with no derived dates', () => {
    const draft = toAdminUserSubscriptionStatisticsDraft({
      userId: 'user_free',
      generatedAt: new Date('2026-09-06T12:00:00.000Z'),
      current: null,
      history: [],
      paidInvoices: [],
      recentInvoices: [],
    });

    expect(draft.subscription).toBeNull();
    expect(draft.periodLengthMonths).toBeNull();
    expect(draft.nextRenewalAt).toBeNull();
    expect(draft.monthsPaid).toBe(0);
    expect(draft.totalPaidMinor).toEqual([]);
    expect(draft.generatedAt).toBe('2026-09-06T12:00:00.000Z');
  });

  it('derives the period length and renewal date from the current subscription', () => {
    const current = buildSubscription({ billingInterval: BillingInterval.QUARTERLY });
    const draft = toAdminUserSubscriptionStatisticsDraft({
      userId: 'user_1',
      generatedAt: new Date('2026-09-06T12:00:00.000Z'),
      current,
      history: [current],
      paidInvoices: [buildInvoice()],
      recentInvoices: [buildInvoice()],
    });

    expect(draft.periodLengthMonths).toBe(3);
    expect(draft.nextRenewalAt).toBe('2026-09-06T18:45:54.539Z');
    expect(draft.monthsPaid).toBe(1);
    expect(draft.totalPaidMinor).toEqual([{ currency: 'USD', amountMinor: 500 }]);
    expect(draft.subscriptionHistory).toHaveLength(1);
    expect(draft.recentInvoices).toHaveLength(1);
  });
});
