import { AppConfig } from '../../../../app/config/app.config';
import { PrismaService } from '../prisma.service';
import type { PrismaMockRegistry } from './types/prisma-mock-registry.types';

// Mocked at the module boundary: the point of this suite is the lifecycle
// wiring (connect on init, disconnect on destroy, URL sourced from AppConfig),
// not Prisma's own behaviour — a real client would need a live database.
//
// The spies are created INSIDE each factory and re-exported, because ts-jest
// hoists jest.mock above the imports; a spy declared in module scope would not
// yet be initialised when the factory runs.
jest.mock('../../../../generated/prisma', () => {
  const connect = jest.fn(async () => undefined);
  const disconnect = jest.fn(async () => undefined);
  return {
    PrismaClient: class {
      $connect = connect;
      $disconnect = disconnect;
      constructor(public readonly options: unknown) {}
    },
    __connect: connect,
    __disconnect: disconnect,
  };
});

jest.mock('@prisma/adapter-pg', () => {
  const construct = jest.fn();
  return {
    PrismaPg: class {
      constructor(config: unknown) {
        construct(config);
      }
    },
    __construct: construct,
  };
});

const generated = jest.requireMock('../../../../generated/prisma') as PrismaMockRegistry;
const adapter = jest.requireMock('@prisma/adapter-pg') as PrismaMockRegistry;

describe('PrismaService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      PAYMENT_DATABASE_URL: 'postgresql://u:p@payments-db:5432/claw_payments',
      REDIS_URL: 'redis://localhost:6379',
      RABBITMQ_URL: 'amqp://localhost:5672',
      JWT_SECRET: 's'.repeat(32),
      PAYMENT_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
      INTER_SERVICE_AUTH_TOKEN: 't'.repeat(48),
    } as NodeJS.ProcessEnv;
    AppConfig.validate();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('builds the driver adapter from PAYMENT_DATABASE_URL', () => {
    // The payment service must connect to its OWN database — never auth's.
    new PrismaService();
    expect(adapter.__construct).toHaveBeenCalledWith({
      connectionString: 'postgresql://u:p@payments-db:5432/claw_payments',
    });
  });

  it('connects on module init', async () => {
    const service = new PrismaService();
    await service.onModuleInit();
    expect(generated.__connect).toHaveBeenCalledTimes(1);
  });

  it('disconnects on module destroy', async () => {
    const service = new PrismaService();
    await service.onModuleDestroy();
    expect(generated.__disconnect).toHaveBeenCalledTimes(1);
  });

  it('propagates a connection failure instead of booting half-initialised', async () => {
    generated.__connect?.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const service = new PrismaService();
    await expect(service.onModuleInit()).rejects.toThrow('ECONNREFUSED');
  });
});
