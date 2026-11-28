import { vi } from 'vitest';
import { Permission } from '@claw/shared-types';

import { ROLES_KEY } from '../../../app/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../../../app/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import { UserRole } from '../../../common/enums';
import { AbuseSignalsInternalController } from '../controllers/abuse-signals-internal.controller';
import { AdminAbuseController } from '../controllers/admin-abuse.controller';
import { abuseSignalBodySchema } from '../dto/abuse-signal.dto';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import type { AbuseSignalService } from '../services/abuse-signal.service';
import type { AbuseAdminService } from '../services/abuse-admin.service';

describe('abuseSignalBodySchema (what another service may report)', () => {
  const valid = { userId: 'user-1', code: 'SSRF_REFUSED', source: 'chat-service' };

  it.each([
    AbuseSignalCode.RATE_LIMIT_TRIPPED,
    AbuseSignalCode.FORBIDDEN_PROBE,
    AbuseSignalCode.SSRF_REFUSED,
  ])('accepts the counted code %s', (code) => {
    expect(abuseSignalBodySchema.safeParse({ ...valid, code }).success).toBe(true);
  });

  it.each([AbuseSignalCode.TOKEN_REUSE, AbuseSignalCode.BANNED_DEVICE_SIGNIN])(
    'refuses %s: only auth-service raises its own evidence, so a caller cannot forge it',
    (code) => {
      expect(abuseSignalBodySchema.safeParse({ ...valid, code }).success).toBe(false);
    },
  );

  it.each([
    ['an unknown code', { ...valid, code: 'SOMETHING_ELSE' }],
    ['an empty user id', { ...valid, userId: '' }],
    ['an oversized user id', { ...valid, userId: 'u'.repeat(65) }],
    ['a source with a space', { ...valid, source: 'chat service' }],
    ['a source in capitals', { ...valid, source: 'Chat-Service' }],
    ['a missing source', { userId: 'user-1', code: 'SSRF_REFUSED' }],
    ['a smuggled token field', { ...valid, token: 'x' }],
    ['a smuggled address field', { ...valid, ip: '203.0.113.1' }],
  ])('refuses %s', (_name, body) => {
    expect(abuseSignalBodySchema.safeParse(body).success).toBe(false);
  });
});

describe('AbuseSignalsInternalController', () => {
  it('is service-token only: public to the JWT guard, guarded by ServiceTokenGuard', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AbuseSignalsInternalController)).toBe(true);
    expect(Reflect.getMetadata('__guards__', AbuseSignalsInternalController)).toContain(
      ServiceTokenGuard,
    );
  });

  it('records the signal and always answers the same 202, whatever the outcome', async () => {
    const record = vi.fn().mockResolvedValue('SUSPENDED');
    const controller = new AbuseSignalsInternalController({
      record,
    } as unknown as AbuseSignalService);
    const body = { userId: 'user-1', code: AbuseSignalCode.SSRF_REFUSED, source: 'chat-service' };
    await expect(controller.report(body)).resolves.toEqual({ accepted: true });
    expect(record).toHaveBeenCalledWith(body);
    record.mockResolvedValue('IGNORED');
    await expect(controller.report(body)).resolves.toEqual({ accepted: true });
  });
});

describe('AdminAbuseController', () => {
  it('is admin-only and needs the users permission', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminAbuseController)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, AdminAbuseController)).toEqual([
      Permission.ADMIN_USERS_MANAGE,
    ]);
  });

  it('hands the account id to the service and returns its view', async () => {
    const view = vi.fn().mockResolvedValue({ suspensions: [] });
    const controller = new AdminAbuseController({ view } as unknown as AbuseAdminService);
    await expect(controller.view({ userId: 'user-1' })).resolves.toEqual({ suspensions: [] });
    expect(view).toHaveBeenCalledWith('user-1');
  });
});
