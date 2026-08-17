import { registerSchema } from '../register.dto';

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
});
