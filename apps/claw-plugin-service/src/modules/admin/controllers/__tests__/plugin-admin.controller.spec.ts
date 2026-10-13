import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Permission, UserRole } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import {
  buildGuards,
  GUARD_SECRET,
  runGuards,
  signToken,
} from '../../../__tests__/controller-guards.fixture';
import { catalogSlugSchema } from '../../../catalog/dto/catalog-query.dto';
import { updateAdminCatalogBodySchema, updateSettingsBodySchema } from '../../dto/admin.dto';
import { PluginAdminController } from '../plugin-admin.controller';

const PROTO = PluginAdminController.prototype;
const ADMIN = { id: 'admin-1', email: 'a@claw.local', role: UserRole.ADMIN, sessionId: 's-1' };
const handlers = [
  ['listCatalog', PROTO.listCatalog],
  ['getCatalogEntry', PROTO.getCatalogEntry],
  ['updateCatalogEntry', PROTO.updateCatalogEntry],
  ['listSettings', PROTO.listSettings],
  ['updateSettings', PROTO.updateSettings],
] as const;

function buildController() {
  const catalog = {
    list: vi.fn().mockResolvedValue(['list']),
    get: vi.fn().mockResolvedValue('get'),
    update: vi.fn().mockResolvedValue('update'),
  };
  const settings = {
    list: vi.fn().mockResolvedValue(['settings']),
    update: vi.fn().mockResolvedValue(['updated']),
  };
  return {
    catalog,
    settings,
    controller: new PluginAdminController(catalog as never, settings as never),
  };
}

describe('PluginAdminController', () => {
  const previousSecret = process.env['JWT_SECRET'];

  beforeEach(() => {
    process.env['JWT_SECRET'] = GUARD_SECRET;
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env['JWT_SECRET'];
    else process.env['JWT_SECRET'] = previousSecret;
  });

  it('requires PLUGINS_ADMIN on the whole controller', () => {
    expect(Reflect.getMetadata('claw:require-permissions', PluginAdminController)).toEqual([
      Permission.PLUGINS_ADMIN,
    ]);
  });

  describe.each(handlers)('guards on %s', (_name, handler) => {
    it('answers 401 with no token', async () => {
      await expect(
        runGuards(buildGuards([Permission.PLUGINS_ADMIN]), PluginAdminController, handler),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('answers 403 for a user with every plugin permission except admin', async () => {
      const guards = buildGuards([
        Permission.PLUGINS_USE,
        Permission.PLUGINS_INSTALL,
        Permission.PLUGINS_MANAGE_OWN_SERVERS,
      ]);

      const failure = await runGuards(
        guards,
        PluginAdminController,
        handler,
        `Bearer ${signToken(UserRole.USER)}`,
      ).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ForbiddenException);
      expect((failure as ForbiddenException).getResponse()).toMatchObject({
        requiredPermissions: [Permission.PLUGINS_ADMIN],
      });
    });

    it('lets a user holding PLUGINS_ADMIN through', async () => {
      await expect(
        runGuards(
          buildGuards([Permission.PLUGINS_ADMIN]),
          PluginAdminController,
          handler,
          `Bearer ${signToken(UserRole.USER)}`,
        ),
      ).resolves.toBe(true);
    });

    it('lets the ADMIN role through without asking auth-service', async () => {
      const guards = buildGuards([]);

      await expect(
        runGuards(guards, PluginAdminController, handler, `Bearer ${signToken(UserRole.ADMIN)}`),
      ).resolves.toBe(true);
      expect(guards.adapter.getEntitlements).not.toHaveBeenCalled();
    });
  });

  describe('delegation', () => {
    it('lists and reads catalog entries and settings', async () => {
      const { controller, catalog, settings } = buildController();

      await controller.listCatalog();
      await controller.getCatalogEntry('weather');
      await controller.listSettings();

      expect(catalog.list).toHaveBeenCalledTimes(1);
      expect(catalog.get).toHaveBeenCalledWith('weather');
      expect(settings.list).toHaveBeenCalledTimes(1);
    });

    it('passes the acting admin from the token on every write', async () => {
      const { controller, catalog, settings } = buildController();

      await controller.updateCatalogEntry(ADMIN, 'weather', { globallyEnabled: false });
      await controller.updateSettings(ADMIN, { values: { 'loop.maxRounds': 4 } });

      expect(catalog.update).toHaveBeenCalledWith('admin-1', 'weather', { globallyEnabled: false });
      expect(settings.update).toHaveBeenCalledWith('admin-1', { values: { 'loop.maxRounds': 4 } });
    });
  });

  describe('input validation', () => {
    it('needs at least one catalog change and refuses unknown fields', () => {
      expect(updateAdminCatalogBodySchema.safeParse({}).success).toBe(false);
      expect(updateAdminCatalogBodySchema.safeParse({ tools: [] }).success).toBe(false);
      expect(updateAdminCatalogBodySchema.safeParse({ featured: true }).success).toBe(true);
      expect(updateAdminCatalogBodySchema.safeParse({ globallyEnabled: false }).success).toBe(true);
      expect(
        updateAdminCatalogBodySchema.safeParse({
          tools: [{ name: 'get_weather', disabledByAdmin: true }],
        }).success,
      ).toBe(true);
      expect(updateAdminCatalogBodySchema.safeParse({ featured: true, status: 'x' }).success).toBe(
        false,
      );
      expect(
        updateAdminCatalogBodySchema.safeParse({
          tools: [{ name: 'Bad Name', disabledByAdmin: true }],
        }).success,
      ).toBe(false);
    });

    it('needs at least one setting and only booleans or numbers', () => {
      expect(updateSettingsBodySchema.safeParse({ values: {} }).success).toBe(false);
      expect(updateSettingsBodySchema.safeParse({ values: { a: 'text' } }).success).toBe(false);
      expect(updateSettingsBodySchema.safeParse({ values: { a: true, b: 3 } }).success).toBe(true);
      expect(updateSettingsBodySchema.safeParse({}).success).toBe(false);
      const tooMany = Object.fromEntries(
        Array.from({ length: 21 }, (_, i) => [`k${String(i)}`, 1]),
      );
      expect(updateSettingsBodySchema.safeParse({ values: tooMany }).success).toBe(false);
    });

    it('rejects a malformed slug before the service', () => {
      const pipe = new ZodValidationPipe(catalogSlugSchema);

      expect(() => pipe.transform('../etc', { type: 'param' })).toThrow(BadRequestException);
      expect(pipe.transform('weather', { type: 'param' })).toBe('weather');
    });
  });
});
