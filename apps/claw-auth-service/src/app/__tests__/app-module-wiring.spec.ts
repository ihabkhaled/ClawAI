import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { REDIS_CLIENT } from '../../infrastructure/redis/constants/redis.constants';
import { AbuseSignalService } from '../../modules/abuse-defense/services/abuse-signal.service';
import { BannedDeviceService } from '../../modules/abuse-defense/services/banned-device.service';
import { LoginScreeningService } from '../../modules/anti-abuse/services/login-screening.service';
import { RegistrationScreeningService } from '../../modules/anti-abuse/services/registration-screening.service';
import { TokenSessionManager } from '../../modules/auth/managers/token-session.manager';
import { UserAdminActionsService } from '../../modules/users/services/user-admin-actions.service';
import { AppConfig } from '../config/app.config';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { AppModule } from '../app.module';

// The dev auth-service crash-looped with "Nest can't resolve dependencies of the GlobalExceptionFilter
// (?)" because a constructor parameter typed `Pick<...>` is emitted as `Object` (2026-11-28). No unit
// spec builds the module graph, so none could notice. This one compiles the REAL AppModule with only the
// I/O edges (database client, Redis client, broker) replaced, so a provider that Nest cannot resolve
// fails here instead of at container start.
describe('AppModule wiring', () => {
  it('resolves every provider, including the ones that guard sign-in and the global filter', async () => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      JWT_SECRET: 'j'.repeat(40),
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
      ENCRYPTION_KEY: 'a'.repeat(64),
      INTER_SERVICE_AUTH_TOKEN: 'i'.repeat(40),
      REDIS_URL: 'redis://localhost:6379',
    } as ReturnType<typeof AppConfig.get>);
    const rabbit = { publish: vi.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(REDIS_CLIENT)
      .useValue({ quit: vi.fn().mockResolvedValue('OK') })
      .overrideProvider(RabbitMQService)
      .useValue(rabbit)
      .compile();

    expect(moduleRef.get(AbuseSignalService, { strict: false })).toBeInstanceOf(AbuseSignalService);
    expect(moduleRef.get(BannedDeviceService, { strict: false })).toBeInstanceOf(
      BannedDeviceService,
    );
    expect(moduleRef.get(LoginScreeningService, { strict: false })).toBeInstanceOf(
      LoginScreeningService,
    );
    expect(moduleRef.get(RegistrationScreeningService, { strict: false })).toBeInstanceOf(
      RegistrationScreeningService,
    );
    expect(moduleRef.get(TokenSessionManager, { strict: false })).toBeInstanceOf(
      TokenSessionManager,
    );
    expect(moduleRef.get(UserAdminActionsService, { strict: false })).toBeInstanceOf(
      UserAdminActionsService,
    );
    await moduleRef.close();
  }, 60_000);

  it('the global filter takes the abuse reporter by class token, not by an interface type', () => {
    const params = Reflect.getMetadata('design:paramtypes', GlobalExceptionFilter) as unknown[];
    const injected = Reflect.getMetadata('self:paramtypes', GlobalExceptionFilter) as Array<{
      index: number;
      param: unknown;
    }>;
    expect(params).toHaveLength(1);
    expect(injected).toEqual([{ index: 0, param: AbuseSignalService }]);
  });
});
