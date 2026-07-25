import { AppConfig } from '../app.config';

const VALID_HEX_KEY = 'a'.repeat(64);
const VALID_JWT_SECRET = 's'.repeat(32);

function baseEnv(): Record<string, string> {
  return {
    PAYMENT_DATABASE_URL: 'postgresql://u:p@localhost:5453/claw_payments',
    REDIS_URL: 'redis://localhost:6379',
    RABBITMQ_URL: 'amqp://localhost:5672',
    JWT_SECRET: VALID_JWT_SECRET,
    PAYMENT_TOKEN_ENCRYPTION_KEY: VALID_HEX_KEY,
  };
}

describe('AppConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...baseEnv() } as NodeJS.ProcessEnv;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('required variables', () => {
    it('validates a minimal valid environment', () => {
      const config = AppConfig.validate();
      expect(config.PAYMENT_DATABASE_URL).toContain('claw_payments');
      expect(config.PAYMENT_SERVICE_PORT).toBe(4018);
    });

    it.each([
      'PAYMENT_DATABASE_URL',
      'REDIS_URL',
      'RABBITMQ_URL',
      'JWT_SECRET',
      'PAYMENT_TOKEN_ENCRYPTION_KEY',
    ])('rejects a missing %s', (key) => {
      const env = baseEnv();
      Reflect.deleteProperty(env, key);
      process.env = env as NodeJS.ProcessEnv;
      expect(() => AppConfig.validate()).toThrow(/Invalid environment configuration/);
    });

    it('names the offending variable without printing its value', () => {
      // A config error must never leak a secret into a boot log.
      process.env['JWT_SECRET'] = 'too-short';
      try {
        AppConfig.validate();
        throw new Error('expected throw');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('JWT_SECRET');
        expect(message).not.toContain('too-short');
      }
    });
  });

  describe('payment token encryption key', () => {
    it('requires exactly 64 hex characters', () => {
      process.env['PAYMENT_TOKEN_ENCRYPTION_KEY'] = 'a'.repeat(63);
      expect(() => AppConfig.validate()).toThrow(/PAYMENT_TOKEN_ENCRYPTION_KEY/);
    });

    it('rejects a non-hex key of the right length', () => {
      process.env['PAYMENT_TOKEN_ENCRYPTION_KEY'] = 'z'.repeat(64);
      expect(() => AppConfig.validate()).toThrow(/valid hex/);
    });

    it('defaults the key version to 1 for a fresh install', () => {
      expect(AppConfig.validate().PAYMENT_TOKEN_KEY_VERSION).toBe(1);
    });

    it('accepts a bumped key version during rotation', () => {
      process.env['PAYMENT_TOKEN_KEY_VERSION'] = '2';
      expect(AppConfig.validate().PAYMENT_TOKEN_KEY_VERSION).toBe(2);
    });
  });

  describe('gateway configuration', () => {
    it('leaves both gateways unset in a local dev environment', () => {
      const config = AppConfig.validate();
      expect(config.PAYPAL_CLIENT_ID).toBeUndefined();
      expect(config.PAYMOB_SECRET_KEY).toBeUndefined();
    });

    it('defaults PayPal to sandbox', () => {
      expect(AppConfig.validate().PAYPAL_ENV).toBe('sandbox');
    });

    it('rejects an unknown PayPal environment', () => {
      process.env['PAYPAL_ENV'] = 'staging';
      expect(() => AppConfig.validate()).toThrow(/PAYPAL_ENV/);
    });

    it('refuses to boot production against sandbox PayPal credentials', () => {
      // Booting prod with sandbox credentials means real customers reach a
      // gateway that will never settle. Fail fast instead.
      process.env['NODE_ENV'] = 'production';
      process.env['PAYPAL_CLIENT_ID'] = 'id';
      process.env['PAYPAL_CLIENT_SECRET'] = 'secret';
      process.env['PAYPAL_ENV'] = 'sandbox';
      expect(() => AppConfig.validate()).toThrow(/PAYPAL_ENV must be "live"/);
    });

    it('allows production when PayPal is live', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['PAYPAL_CLIENT_ID'] = 'id';
      process.env['PAYPAL_CLIENT_SECRET'] = 'secret';
      process.env['PAYPAL_ENV'] = 'live';
      expect(() => AppConfig.validate()).not.toThrow();
    });

    it('allows production when PayPal is not configured at all', () => {
      process.env['NODE_ENV'] = 'production';
      expect(() => AppConfig.validate()).not.toThrow();
    });

    it('defaults the Paymob settlement currency to EGP', () => {
      expect(AppConfig.validate().PAYMOB_CURRENCY).toBe('EGP');
    });

    it('rejects a malformed currency code', () => {
      process.env['PAYMOB_CURRENCY'] = 'EGYP';
      expect(() => AppConfig.validate()).toThrow();
    });
  });

  describe('operational defaults', () => {
    it('applies safe defaults for FX and lifecycle bounds', () => {
      const config = AppConfig.validate();
      expect(config.FX_SAFETY_MARGIN_BPS).toBe(150);
      expect(config.FX_QUOTE_TTL_MS).toBe(900_000);
      expect(config.WEBHOOK_REPLAY_TOLERANCE_MS).toBe(600_000);
      expect(config.BILLING_GRACE_PERIOD_MS).toBe(259_200_000);
      expect(config.PAYMENT_GATEWAY_TIMEOUT_MS).toBe(20_000);
      expect(config.PAYMENT_OUTBOX_MAX_ATTEMPTS).toBe(10);
    });

    it('rejects a negative FX safety margin', () => {
      process.env['FX_SAFETY_MARGIN_BPS'] = '-1';
      expect(() => AppConfig.validate()).toThrow();
    });

    it('rejects a zero gateway timeout, which would mean no bound at all', () => {
      process.env['PAYMENT_GATEWAY_TIMEOUT_MS'] = '0';
      expect(() => AppConfig.validate()).toThrow();
    });

    it('coerces numeric strings from the environment', () => {
      process.env['PAYMENT_SERVICE_PORT'] = '4018';
      process.env['FX_SAFETY_MARGIN_BPS'] = '250';
      const config = AppConfig.validate();
      expect(config.PAYMENT_SERVICE_PORT).toBe(4018);
      expect(config.FX_SAFETY_MARGIN_BPS).toBe(250);
    });
  });

  describe('get', () => {
    it('returns the cached config after validate', () => {
      const validated = AppConfig.validate();
      expect(AppConfig.get()).toBe(validated);
    });

    it('validates lazily when nothing has been cached yet', () => {
      // A fresh module registry means the module-level cache is empty, which is
      // the state on the very first get() during boot.
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fresh = require('../app.config') as { AppConfig: typeof AppConfig };
        expect(fresh.AppConfig.get().PAYMENT_SERVICE_PORT).toBe(4018);
      });
    });
  });
});
