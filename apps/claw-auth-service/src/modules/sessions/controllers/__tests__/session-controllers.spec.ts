import 'reflect-metadata';
import { Permission } from '@claw/shared-types';
import { PERMISSIONS_KEY } from '../../../../app/decorators/permissions.decorator';
import { ROLES_KEY } from '../../../../app/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../../../../app/decorators/public.decorator';
import { UserRole } from '../../../../common/enums';
import { SessionAdminController } from '../session-admin.controller';
import { SessionGlobalController } from '../session-global.controller';

const ADMIN_HANDLERS = [
  'list',
  'terminateAll',
  'terminateOne',
  'clearInactive',
  'clearOne',
] as const;
const GLOBAL_HANDLERS = ['challenge', 'terminateAll', 'clearLogs'] as const;

describe('session controllers are admin-only (a non-admin gets 403 from the role guard)', () => {
  it.each(ADMIN_HANDLERS)('SessionAdminController.%s needs ADMIN + ADMIN_USERS_MANAGE', (name) => {
    const handler = SessionAdminController.prototype[name];
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([Permission.ADMIN_USERS_MANAGE]);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it.each(GLOBAL_HANDLERS)(
    'SessionGlobalController.%s needs ADMIN + ADMIN_USERS_MANAGE',
    (name) => {
      const handler = SessionGlobalController.prototype[name];
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.ADMIN]);
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
        Permission.ADMIN_USERS_MANAGE,
      ]);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    },
  );

  it('rate-limits every mutation and the password step', () => {
    for (const name of ['terminateAll', 'terminateOne', 'clearInactive', 'clearOne'] as const) {
      expect(
        Reflect.getMetadata('THROTTLER:LIMITdefault', SessionAdminController.prototype[name]),
      ).toBeGreaterThan(0);
    }
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', SessionGlobalController.prototype.challenge),
    ).toBe(10);
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', SessionGlobalController.prototype.terminateAll),
    ).toBe(5);
  });

  it('the challenge reply (it carries a one-time token) is never cacheable', () => {
    const headers = Reflect.getMetadata('__headers__', SessionGlobalController.prototype.challenge);
    expect(JSON.stringify(headers)).toContain('no-store');
  });
});
