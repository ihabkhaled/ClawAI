import { AppConfig } from '../app/config/app.config';

describe('AppConfig', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    AppConfig.reset();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
    AppConfig.reset();
  });

  function setRequiredEnv(): void {
    process.env['LLAMACPP_DATABASE_URL'] = 'postgresql://user:pw@host:5432/db';
    process.env['LLAMACPP_SERVICE_URL'] = 'http://llamacpp:4017';
    process.env['LLAMACPP_DATA_PATH'] = '/var/lib/claw/llamacpp';
    process.env['JWT_SECRET'] = 'a'.repeat(48);
    process.env['RABBITMQ_URL'] = 'amqp://localhost:5672';
  }

  it('validates LLAMACPP_DATA_PATH presence', () => {
    setRequiredEnv();
    delete process.env['LLAMACPP_DATA_PATH'];
    expect(() => AppConfig.validate()).toThrow(/LLAMACPP_DATA_PATH/);
  });

  it('rejects missing LLAMACPP_DATABASE_URL', () => {
    setRequiredEnv();
    delete process.env['LLAMACPP_DATABASE_URL'];
    expect(() => AppConfig.validate()).toThrow(/LLAMACPP_DATABASE_URL/);
  });

  it('returns parsed config with defaults', () => {
    setRequiredEnv();
    const config = AppConfig.validate();
    expect(config.LLAMACPP_PORT).toBe('4017');
    expect(config.LLAMACPP_DEFAULT_CTX_SIZE).toBe(8192);
    expect(config.LLAMACPP_AUTO_INSTALL_BINARY).toBe(true);
  });
});
