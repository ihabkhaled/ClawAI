import { Permission } from '@claw/shared-types';

import { ALL_PERMISSIONS, SYSTEM_ROLE_SEED, USER_DEFAULT_PERMISSIONS } from '../rbac.constants';

describe('rbac.constants', () => {
  describe('USER_DEFAULT_PERMISSIONS', () => {
    it('includes WORKSPACE_VIEW so /workspace landing page is visible to USER', () => {
      expect(USER_DEFAULT_PERMISSIONS).toContain(Permission.WORKSPACE_VIEW);
    });

    it('includes WORKSPACE_APP_CONFIG_VIEW so /workspace/app-configs is visible to USER', () => {
      expect(USER_DEFAULT_PERMISSIONS).toContain(Permission.WORKSPACE_APP_CONFIG_VIEW);
    });

    it('keeps WORKSPACE_CONNECT_OWN so USER can initiate OAuth for their own connector', () => {
      expect(USER_DEFAULT_PERMISSIONS).toContain(Permission.WORKSPACE_CONNECT_OWN);
    });

    it('keeps WORKSPACE_READ_OWN / WORKSPACE_SYNC_OWN / WORKSPACE_ACTION_OWN', () => {
      expect(USER_DEFAULT_PERMISSIONS).toContain(Permission.WORKSPACE_READ_OWN);
      expect(USER_DEFAULT_PERMISSIONS).toContain(Permission.WORKSPACE_SYNC_OWN);
      expect(USER_DEFAULT_PERMISSIONS).toContain(Permission.WORKSPACE_ACTION_OWN);
    });

    it('does NOT include any ADMIN_* permission (admin-only writes must stay locked)', () => {
      for (const perm of USER_DEFAULT_PERMISSIONS) {
        expect(perm.startsWith('ADMIN_')).toBe(false);
      }
    });
  });

  describe('SYSTEM_ROLE_SEED', () => {
    it('grants the ADMIN role every permission in the catalog', () => {
      const adminSeed = SYSTEM_ROLE_SEED.find((r) => r.slug === 'ADMIN');
      expect(adminSeed).toBeDefined();
      expect(adminSeed?.permissions).toEqual(ALL_PERMISSIONS);
      expect(adminSeed?.permissions).toContain(Permission.WORKSPACE_VIEW);
      expect(adminSeed?.permissions).toContain(Permission.WORKSPACE_APP_CONFIG_VIEW);
    });

    it('grants the USER role the USER_DEFAULT_PERMISSIONS set', () => {
      const userSeed = SYSTEM_ROLE_SEED.find((r) => r.slug === 'USER');
      expect(userSeed?.permissions).toEqual(USER_DEFAULT_PERMISSIONS);
    });
  });

  describe('ALL_PERMISSIONS', () => {
    it('contains the two new workspace view permissions', () => {
      expect(ALL_PERMISSIONS).toContain(Permission.WORKSPACE_VIEW);
      expect(ALL_PERMISSIONS).toContain(Permission.WORKSPACE_APP_CONFIG_VIEW);
    });
  });
});
