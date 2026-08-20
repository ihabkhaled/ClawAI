import {
  cancelEmailChangeSchema,
  confirmEmailChangeSchema,
  confirmOldEmailOtpSchema,
  requestEmailChangeSchema,
  resendEmailChangeOtpSchema,
} from '../email-change.dto';

const request = { currentPassword: 'current-password', newEmail: 'new@example.com' };
const otp = { requestId: 'request-id', otp: '123456' };
const requestId = { requestId: 'request-id' };
const token = { token: 't'.repeat(32) };

describe('email change DTO schemas', () => {
  it.each([
    ['request', requestEmailChangeSchema, request],
    ['old-email OTP', confirmOldEmailOtpSchema, otp],
    ['resend', resendEmailChangeOtpSchema, requestId],
    ['cancel', cancelEmailChangeSchema, requestId],
    ['confirm', confirmEmailChangeSchema, token],
  ] as const)('accepts valid %s input and rejects unknown keys', (_name, schema, value) => {
    expect(schema.safeParse(value).success).toBe(true);
    expect(schema.safeParse({ ...value, extra: true }).success).toBe(false);
  });

  it('enforces request field bounds', () => {
    expect(requestEmailChangeSchema.safeParse({ ...request, currentPassword: '' }).success).toBe(
      false,
    );
    expect(
      requestEmailChangeSchema.safeParse({ ...request, currentPassword: 'p'.repeat(257) }).success,
    ).toBe(false);
    expect(requestEmailChangeSchema.safeParse({ ...request, newEmail: 'invalid' }).success).toBe(
      false,
    );
  });

  it.each(['12345', '1234567', 'abcdef'])('rejects invalid OTP %s', (value) => {
    expect(confirmOldEmailOtpSchema.safeParse({ ...otp, otp: value }).success).toBe(false);
  });

  it.each([confirmOldEmailOtpSchema, resendEmailChangeOtpSchema, cancelEmailChangeSchema])(
    'enforces requestId bounds',
    (schema) => {
      expect(schema.safeParse({ ...requestId, requestId: '' }).success).toBe(false);
      expect(schema.safeParse({ ...requestId, requestId: 'r'.repeat(65) }).success).toBe(false);
    },
  );

  it('enforces confirmation token bounds', () => {
    expect(confirmEmailChangeSchema.safeParse({ token: 't'.repeat(31) }).success).toBe(false);
    expect(confirmEmailChangeSchema.safeParse({ token: 't'.repeat(257) }).success).toBe(false);
  });
});
