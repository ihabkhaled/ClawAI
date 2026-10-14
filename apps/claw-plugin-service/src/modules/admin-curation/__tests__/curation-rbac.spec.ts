import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Permission, UserRole } from '@claw/shared-types';

import {
  buildGuards,
  GUARD_SECRET,
  runGuards,
  signToken,
} from '../../__tests__/controller-guards.fixture';
import { CuratedCatalogController } from '../controllers/curated-catalog.controller';
import { HostRulesAdminController } from '../controllers/host-rules-admin.controller';
import { ServerApprovalController } from '../controllers/server-approval.controller';

type Handler = (...args: never[]) => unknown;
type Controller = new (...args: never[]) => unknown;

function routes(controller: Controller, names: string[]): Array<[string, Controller, Handler]> {
  const proto = controller.prototype as Record<string, Handler>;
  return names.map((name) => [`${controller.name}.${name}`, controller, proto[name] as Handler]);
}

const ROUTES = [
  ...routes(CuratedCatalogController, [
    'list',
    'preview',
    'get',
    'create',
    'update',
    'setState',
    'checkHealth',
    'remove',
  ]),
  ...routes(ServerApprovalController, ['list', 'get', 'approve', 'reject']),
  ...routes(HostRulesAdminController, ['listRules', 'createRule', 'removeRule', 'listAudit']),
];

describe('admin catalog curation: RBAC', () => {
  const previousSecret = process.env['JWT_SECRET'];

  beforeEach(() => {
    process.env['JWT_SECRET'] = GUARD_SECRET;
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env['JWT_SECRET'];
    else process.env['JWT_SECRET'] = previousSecret;
  });

  it.each([CuratedCatalogController, ServerApprovalController, HostRulesAdminController])(
    '%o requires PLUGINS_ADMIN on the whole controller',
    (controller) => {
      expect(Reflect.getMetadata('claw:require-permissions', controller)).toEqual([
        Permission.PLUGINS_ADMIN,
      ]);
    },
  );

  it('covers every route handler of the three controllers', () => {
    for (const [name, , handler] of ROUTES) {
      expect(typeof handler, name).toBe('function');
    }
    expect(ROUTES).toHaveLength(16);
  });

  describe.each(ROUTES)('guards on %s', (_name, controller, handler) => {
    it('answers 401 with no token', async () => {
      await expect(
        runGuards(buildGuards([Permission.PLUGINS_ADMIN]), controller, handler),
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
        controller,
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
          controller,
          handler,
          `Bearer ${signToken(UserRole.USER)}`,
        ),
      ).resolves.toBe(true);
    });

    it('lets the ADMIN role through', async () => {
      await expect(
        runGuards(buildGuards([]), controller, handler, `Bearer ${signToken(UserRole.ADMIN)}`),
      ).resolves.toBe(true);
    });
  });

  describe('the acting admin comes from the token', () => {
    const ADMIN = { id: 'admin-9', email: 'a@claw.local', role: UserRole.ADMIN, sessionId: 's-1' };

    it('passes user.id to every write', async () => {
      const catalog = {
        create: vi.fn(),
        update: vi.fn(),
        setEnabled: vi.fn(),
        checkHealth: vi.fn(),
        remove: vi.fn(),
      };
      const approvals = { approve: vi.fn(), reject: vi.fn() };
      const rules = { create: vi.fn(), remove: vi.fn() };
      const catalogController = new CuratedCatalogController(catalog as never);
      const approvalController = new ServerApprovalController(approvals as never);
      const rulesController = new HostRulesAdminController(rules as never, {} as never);
      const id = '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10';

      await catalogController.create(ADMIN, { slug: 'x' } as never);
      await catalogController.update(ADMIN, 'vendor-docs', {} as never);
      await catalogController.setState(ADMIN, 'vendor-docs', { enabled: false });
      await catalogController.checkHealth(ADMIN, 'vendor-docs');
      await catalogController.remove(ADMIN, 'vendor-docs');
      await approvalController.approve(ADMIN, id);
      await approvalController.reject(ADMIN, id, { reason: 'No.' });
      await rulesController.createRule(ADMIN, {} as never);
      await rulesController.removeRule(ADMIN, id);

      expect(catalog.create.mock.calls[0]?.[0]).toBe('admin-9');
      expect(catalog.update.mock.calls[0]?.[0]).toBe('admin-9');
      expect(catalog.setEnabled).toHaveBeenCalledWith('admin-9', 'vendor-docs', false);
      expect(catalog.checkHealth).toHaveBeenCalledWith('admin-9', 'vendor-docs');
      expect(catalog.remove).toHaveBeenCalledWith('admin-9', 'vendor-docs');
      expect(approvals.approve).toHaveBeenCalledWith('admin-9', id);
      expect(approvals.reject).toHaveBeenCalledWith('admin-9', id, 'No.');
      expect(rules.create.mock.calls[0]?.[0]).toBe('admin-9');
      expect(rules.remove).toHaveBeenCalledWith('admin-9', id);
    });
  });
});
