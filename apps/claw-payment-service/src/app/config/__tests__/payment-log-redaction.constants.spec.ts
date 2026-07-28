import { PAYMENT_LOG_REDACTION_PATHS } from '../payment-log-redaction.constants';

describe('PAYMENT_LOG_REDACTION_PATHS', () => {
  it('redacts the complete request URL and parsed query from automatic HTTP logs', () => {
    expect(PAYMENT_LOG_REDACTION_PATHS).toEqual(
      expect.arrayContaining(['req.url', 'req.query', '*.hmac']),
    );
  });
});
