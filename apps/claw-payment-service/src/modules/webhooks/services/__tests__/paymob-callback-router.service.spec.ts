import { PaymobCallbackRouterService } from '../paymob-callback-router.service';
import type { PaymobCardTokenService } from '../paymob-card-token.service';
import type { PaymobWebhookService } from '../paymob-webhook.service';

describe('PaymobCallbackRouterService', () => {
  const transactions = { handle: jest.fn().mockResolvedValue({ outcome: 'PROCESSED' }) };
  const cardTokens = { handle: jest.fn().mockResolvedValue({ outcome: 'PROCESSED' }) };
  const service = new PaymobCallbackRouterService(
    transactions as unknown as PaymobWebhookService,
    cardTokens as unknown as PaymobCardTokenService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes card-token notification payloads to the HMAC-verifying token handler', async () => {
    const rawBody = JSON.stringify({ type: 'TOKEN', obj: { id: 1 } });

    await service.handle(rawBody, 'signed-hmac');

    expect(cardTokens.handle).toHaveBeenCalledWith(rawBody, 'signed-hmac');
    expect(transactions.handle).not.toHaveBeenCalled();
  });

  it('routes transaction payloads to the HMAC-verifying transaction handler', async () => {
    const rawBody = JSON.stringify({ type: 'TRANSACTION', obj: { id: 1 } });

    await service.handle(rawBody, 'signed-hmac');

    expect(transactions.handle).toHaveBeenCalledWith(rawBody, 'signed-hmac');
    expect(cardTokens.handle).not.toHaveBeenCalled();
  });

  it('sends malformed payloads to the transaction handler for safe rejection', async () => {
    await service.handle('not-json', 'signed-hmac');

    expect(transactions.handle).toHaveBeenCalledWith('not-json', 'signed-hmac');
    expect(cardTokens.handle).not.toHaveBeenCalled();
  });
});
