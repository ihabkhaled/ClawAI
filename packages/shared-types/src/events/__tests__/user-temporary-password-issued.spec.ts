import { EventPattern, type UserTemporaryPasswordIssuedPayload } from '..';

describe('UserTemporaryPasswordIssuedPayload', () => {
  it('uses the canonical event pattern', () => {
    expect(EventPattern.USER_TEMPORARY_PASSWORD_ISSUED).toBe('user.temporary_password_issued');
  });

  it('contains identifiers and trace metadata without secrets or PII', () => {
    const payload = {
      userId: 'user-123',
      issuedBy: 'admin-456',
      timestamp: new Date().toISOString(),
      correlationId: 'corr-789',
    } satisfies UserTemporaryPasswordIssuedPayload;

    expect(Object.keys(payload).sort()).toEqual([
      'correlationId',
      'issuedBy',
      'timestamp',
      'userId',
    ]);
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('passwordHash');
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('token');
  });
});
