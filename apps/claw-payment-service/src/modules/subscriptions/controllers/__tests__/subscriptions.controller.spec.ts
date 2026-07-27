import { UserRole } from '@claw/shared-types';

import { SubscriptionsController } from '../subscriptions.controller';

describe('SubscriptionsController invoice documents', () => {
  it('downloads only through the owned document service with safe headers', async () => {
    const documents = {
      renderOwned: jest.fn().mockResolvedValue({
        bytes: new Uint8Array([37, 80, 68, 70]),
        filename: 'CLAW-00000001.pdf',
      }),
    };
    const response = { set: jest.fn() };
    const controller = new SubscriptionsController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      documents as never,
    );

    const file = await controller.downloadInvoice(
      { id: 'user-1', email: 'buyer@example.com', role: UserRole.USER },
      { id: 'invoice-1' },
      response as never,
    );

    expect(documents.renderOwned).toHaveBeenCalledWith('user-1', 'invoice-1');
    expect(response.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="CLAW-00000001.pdf"',
      'Cache-Control': 'private, no-store',
    });
    expect(file.getStream()).toBeDefined();
  });
});
