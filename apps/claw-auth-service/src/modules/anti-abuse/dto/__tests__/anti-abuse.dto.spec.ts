import { loginSchema } from '../../../auth/dto/login.dto';
import { registerSchema } from '../../../auth/dto/register.dto';
import { botCheckConfigQuerySchema, botCheckSchema, deviceSchema } from '../anti-abuse.dto';

const FINGERPRINT = 'AB'.repeat(32);
const REGISTER = {
  email: 'new@example.com',
  password: 'Str0ngPass',
  firstName: 'Jane',
  lastName: 'Doe',
};

describe('anti-abuse DTO fragments', () => {
  it('accepts a full bot check and rejects unknown keys', () => {
    expect(
      botCheckSchema.safeParse({
        pow: { token: 'a.b', nonce: '123456' },
        turnstileToken: 't',
        recaptchaToken: 'r',
      }).success,
    ).toBe(true);
    expect(botCheckSchema.safeParse({ pow: { token: 'a.b', nonce: '1' }, x: 1 }).success).toBe(
      false,
    );
  });

  it.each(['', '12a', '-1', '1'.repeat(21), '1.5'])('rejects the nonce %p', (nonce) => {
    expect(botCheckSchema.safeParse({ pow: { token: 'a.b', nonce } }).success).toBe(false);
  });

  it('bounds the token lengths', () => {
    expect(botCheckSchema.safeParse({ pow: { token: 'x'.repeat(1025), nonce: '1' } }).success).toBe(
      false,
    );
    expect(botCheckSchema.safeParse({ turnstileToken: 'x'.repeat(4097) }).success).toBe(false);
  });

  it('lowercases a 64-hex fingerprint and rejects anything else', () => {
    const parsed = deviceSchema.parse({ fingerprint: FINGERPRINT, deviceId: 'device-id-0001' });
    expect(parsed.fingerprint).toBe(FINGERPRINT.toLowerCase());
    expect(deviceSchema.safeParse({ fingerprint: 'abc', deviceId: 'device-id-0001' }).success).toBe(
      false,
    );
    expect(
      deviceSchema.safeParse({ fingerprint: FINGERPRINT, deviceId: 'bad id with spaces' }).success,
    ).toBe(false);
  });

  it('accepts bounded signals and drops unknown ones', () => {
    const parsed = deviceSchema.parse({
      fingerprint: FINGERPRINT,
      deviceId: '0b0c7c62-6f3e-4d55-8f0e-0c1d2e3f4a5b',
      signals: { tz: 'Europe/Berlin', cores: 8, memory: 16, touch: false, extra: 'x' },
    });
    expect(parsed.signals).toEqual({ tz: 'Europe/Berlin', cores: 8, memory: 16, touch: false });
    expect(
      deviceSchema.safeParse({
        fingerprint: FINGERPRINT,
        deviceId: 'device-id-0001',
        signals: { webgl: 'x'.repeat(257) },
      }).success,
    ).toBe(false);
  });

  it('accepts an optional login or register action on the config query', () => {
    expect(botCheckConfigQuerySchema.parse({})).toEqual({});
    expect(botCheckConfigQuerySchema.parse({ action: 'login' })).toEqual({ action: 'login' });
    expect(botCheckConfigQuerySchema.safeParse({ action: 'admin' }).success).toBe(false);
  });
});

describe('register and login bodies', () => {
  it('keep botCheck and device optional in the schema (policy refuses, not the pipe)', () => {
    expect(registerSchema.safeParse(REGISTER).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'p' }).success).toBe(true);
  });

  it('carry botCheck and device through', () => {
    const body = {
      botCheck: { pow: { token: 'a.b', nonce: '9' } },
      device: { fingerprint: FINGERPRINT, deviceId: 'device-id-0001' },
    };
    expect(registerSchema.parse({ ...REGISTER, ...body })).toMatchObject({
      botCheck: body.botCheck,
      device: { deviceId: 'device-id-0001' },
    });
    expect(loginSchema.parse({ email: 'a@b.co', password: 'p', ...body })).toMatchObject({
      botCheck: body.botCheck,
    });
  });

  it('login stays strict about anything else', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'p', captcha: 'x' }).success).toBe(
      false,
    );
  });
});
