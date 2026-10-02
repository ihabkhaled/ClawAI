import { registerSchema } from '../register.dto';
import { RegisterValidationIssue } from '../../enums/register-validation-issue.enum';

describe('registerSchema', () => {
  const validPayload = {
    email: 'jane@example.com',
    password: 'SecurePass1!',
    firstName: 'Jane',
    lastName: 'Doe',
  };

  it.each([
    ['firstName', undefined],
    ['firstName', '   '],
    ['firstName', 'a'.repeat(65)],
    ['lastName', undefined],
    ['lastName', '   '],
    ['lastName', 'b'.repeat(65)],
  ])('rejects invalid %s value', (field, value) => {
    expect(registerSchema.safeParse({ ...validPayload, [field]: value }).success).toBe(false);
  });

  it('accepts a valid payload without phone', () => {
    expect(registerSchema.safeParse(validPayload).success).toBe(true);
  });

  it('accepts a valid payload with an E.164 phone', () => {
    expect(registerSchema.safeParse({ ...validPayload, phone: '+1234567890' }).success).toBe(true);
  });

  it('rejects a non-E.164 phone', () => {
    expect(registerSchema.safeParse({ ...validPayload, phone: '123-456' }).success).toBe(false);
  });

  it('strips an injected role', () => {
    const parsed = registerSchema.parse({ ...validPayload, role: 'admin' });
    expect('role' in parsed).toBe(false);
  });

  // The issue message is a stable code the web client translates per field;
  // an English sentence here would end up rendered to a Japanese user.
  it.each([
    ['email', 'not-an-email', RegisterValidationIssue.EMAIL_INVALID],
    ['password', 'Sh0rt', RegisterValidationIssue.PASSWORD_TOO_SHORT],
    ['password', `A1${'a'.repeat(127)}`, RegisterValidationIssue.PASSWORD_TOO_LONG],
    ['password', 'lowercase1', RegisterValidationIssue.PASSWORD_NEEDS_UPPERCASE],
    ['password', 'UPPERCASE1', RegisterValidationIssue.PASSWORD_NEEDS_LOWERCASE],
    ['password', 'NoDigitsHere', RegisterValidationIssue.PASSWORD_NEEDS_NUMBER],
    ['firstName', '   ', RegisterValidationIssue.FIRST_NAME_REQUIRED],
    ['firstName', 'a'.repeat(65), RegisterValidationIssue.FIRST_NAME_TOO_LONG],
    ['lastName', '   ', RegisterValidationIssue.LAST_NAME_REQUIRED],
    ['lastName', 'b'.repeat(65), RegisterValidationIssue.LAST_NAME_TOO_LONG],
    ['phone', '0123', RegisterValidationIssue.PHONE_INVALID],
  ])('reports %s=%j as %s', (field, value, code) => {
    const result = registerSchema.safeParse({ ...validPayload, [field]: value });
    expect(result.success).toBe(false);
    const issues = result.error?.issues.filter((issue) => issue.path[0] === field) ?? [];
    expect(issues.map((issue) => issue.message)).toContain(code);
  });
});
