import { InvoiceLineKind } from '@claw/shared-types';

import { InvoiceWriteRepository } from '../invoice-write.repository';

describe('InvoiceWriteRepository', () => {
  it('creates the immutable invoice and durable delivery intent atomically', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'invoice-1' });
    const tx = {
      invoice: {
        count: jest.fn().mockResolvedValue(0),
        create,
      },
    };
    const repository = new InvoiceWriteRepository();

    await repository.create(tx as never, {
      userId: 'user-1',
      subscriptionId: 'subscription-1',
      recipientEmail: 'buyer@example.com',
      currency: 'USD',
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      periodEnd: new Date('2026-08-01T00:00:00.000Z'),
      amountPaidMinor: 2_000,
      lines: [
        {
          kind: InvoiceLineKind.SUBSCRIPTION,
          description: 'Pro monthly',
          quantity: 1,
          amountMinor: 2_000,
          sortOrder: 0,
        },
      ],
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        delivery: { create: { recipientEmail: 'buyer@example.com' } },
      }),
    });
  });
});
