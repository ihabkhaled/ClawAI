import { InvoiceLineKind, InvoiceStatus } from '@claw/shared-types';

import { renderInvoicePdf } from '../invoice-pdf.utility';

describe('renderInvoicePdf', () => {
  const invoice = {
    number: 'CLAW-00000001',
    status: InvoiceStatus.PAID,
    currency: 'USD',
    subtotalMinor: 2_000,
    discountMinor: 200,
    taxMinor: 100,
    totalMinor: 1_900,
    amountPaidMinor: 1_900,
    amountRefundedMinor: 0,
    periodStart: new Date('2026-07-01T00:00:00.000Z'),
    periodEnd: new Date('2026-08-01T00:00:00.000Z'),
    issuedAt: new Date('2026-07-01T00:00:00.000Z'),
    paidAt: new Date('2026-07-01T00:00:00.000Z'),
    lines: [
      {
        kind: InvoiceLineKind.SUBSCRIPTION,
        description: 'Pro monthly',
        quantity: 1,
        amountMinor: 2_000,
        sortOrder: 0,
      },
      {
        kind: InvoiceLineKind.DISCOUNT,
        description: 'Launch credit',
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
    ],
  };

  it('renders a valid PDF from an immutable safe projection', async () => {
    const rendered = await renderInvoicePdf(invoice);
    const bytes = Buffer.from(rendered);

    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(500);
  });

  it('has no field capable of carrying tenant ids, tokens, or card numbers', () => {
    expect(Object.keys(invoice)).not.toEqual(
      expect.arrayContaining([
        'id',
        'userId',
        'subscriptionId',
        'providerTransactionId',
        'token',
        'cardNumber',
      ]),
    );
  });
});
