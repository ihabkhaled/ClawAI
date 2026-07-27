import { BillingErrorCode, InvoiceLineKind, InvoiceStatus } from '@claw/shared-types';

import { InvoiceDocumentService } from '../invoice-document.service';

const renderedBytes = new Uint8Array([37, 80, 68, 70]);

jest.mock('../../../../common/utilities/invoice-pdf.utility', () => ({
  renderInvoicePdf: jest.fn(async () => renderedBytes),
}));

describe('InvoiceDocumentService', () => {
  const invoice = {
    id: 'invoice-internal',
    userId: 'user-internal',
    subscriptionId: 'subscription-internal',
    number: 'CLAW-00000001',
    status: InvoiceStatus.PAID,
    currency: 'USD',
    subtotalMinor: 2_000,
    discountMinor: 0,
    taxMinor: 0,
    totalMinor: 2_000,
    amountPaidMinor: 2_000,
    amountRefundedMinor: 0,
    periodStart: new Date('2026-07-01T00:00:00.000Z'),
    periodEnd: new Date('2026-08-01T00:00:00.000Z'),
    issuedAt: new Date('2026-07-01T00:00:00.000Z'),
    paidAt: new Date('2026-07-01T00:00:00.000Z'),
    lines: [
      {
        id: 'line-internal',
        invoiceId: 'invoice-internal',
        kind: InvoiceLineKind.SUBSCRIPTION,
        description: 'Pro monthly',
        quantity: 1,
        amountMinor: 2_000,
        sortOrder: 0,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ],
  };
  const repository = { findOwnedWithLines: jest.fn() };
  const service = new InvoiceDocumentService(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findOwnedWithLines.mockResolvedValue(invoice);
  });

  it('renders an owned invoice with a human-safe filename', async () => {
    await expect(service.renderOwned('user-1', 'invoice-1')).resolves.toEqual({
      bytes: renderedBytes,
      filename: 'CLAW-00000001.pdf',
    });
    expect(repository.findOwnedWithLines).toHaveBeenCalledWith('user-1', 'invoice-1');
  });

  it('returns the same not-found result for absent and foreign invoices', async () => {
    repository.findOwnedWithLines.mockResolvedValueOnce(null);

    await expect(service.renderOwned('user-foreign', 'invoice-1')).rejects.toMatchObject({
      code: BillingErrorCode.INVOICE_NOT_FOUND,
    });
  });
});
