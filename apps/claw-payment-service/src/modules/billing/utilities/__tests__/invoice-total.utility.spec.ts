import { InvoiceLineKind } from '@claw/shared-types';

import { sumInvoiceLines } from '../invoice-total.utility';

describe('sumInvoiceLines', () => {
  it('derives the header from integer minor-unit line totals', () => {
    expect(
      sumInvoiceLines([
        {
          kind: InvoiceLineKind.SUBSCRIPTION,
          description: 'Team monthly',
          quantity: 2,
          amountMinor: 1_000,
          sortOrder: 0,
        },
        {
          kind: InvoiceLineKind.DISCOUNT,
          description: 'Credit',
          quantity: 1,
          amountMinor: -200,
          sortOrder: 1,
        },
        {
          kind: InvoiceLineKind.TAX,
          description: 'Tax',
          quantity: 1,
          amountMinor: 100,
          sortOrder: 2,
        },
      ]),
    ).toEqual({
      subtotalMinor: 2_000,
      discountMinor: 200,
      taxMinor: 100,
      totalMinor: 1_900,
    });
  });

  it('preserves symmetric boundary-rounded credit amounts without rounding again', () => {
    expect(
      sumInvoiceLines([
        {
          kind: InvoiceLineKind.PRORATION_CHARGE,
          description: 'Charge rounded once upstream',
          quantity: 1,
          amountMinor: 51,
          sortOrder: 0,
        },
        {
          kind: InvoiceLineKind.PRORATION_CREDIT,
          description: 'Credit rounded once upstream',
          quantity: 1,
          amountMinor: -51,
          sortOrder: 1,
        },
      ]),
    ).toEqual({
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
    });
  });
});
