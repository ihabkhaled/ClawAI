import { setRoutineWebhookSchema } from '../routine-webhook.dto';

describe('setRoutineWebhookSchema', () => {
  it.each([true, false])('accepts enabled=%s', (enabled) => {
    const result = setRoutineWebhookSchema.safeParse({ enabled });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ enabled });
  });

  it.each([
    ['missing body', undefined],
    ['empty object', {}],
    ['null', null],
    ['string true', { enabled: 'true' }],
    ['number 1', { enabled: 1 }],
    ['null enabled', { enabled: null }],
    ['array', [true]],
  ])('rejects %s', (_label, body) => {
    expect(setRoutineWebhookSchema.safeParse(body).success).toBe(false);
  });

  it('drops unknown keys', () => {
    const result = setRoutineWebhookSchema.safeParse({ enabled: true, webhookSecretVersion: 9 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ enabled: true });
  });
});
