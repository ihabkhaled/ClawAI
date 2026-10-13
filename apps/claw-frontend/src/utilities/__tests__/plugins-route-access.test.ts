import { describe, expect, it } from 'vitest';

import { ROUTE_PERMISSIONS, ROUTES, SIDEBAR_NAV_ITEMS } from '@/constants';
import { Permission, PlanFeature } from '@/enums';

import { requiredRequirementForPath } from '../route-permission.utility';
import { filterSidebarItems } from '../sidebar-visibility.utility';

// Plugins and MCP: /plugins needs PLUGINS_USE plus the plan gate, /admin/plugins needs
// PLUGINS_ADMIN. The backend stays the authoritative enforcer; this only gates the UI.

const PLUGINS_NAV_KEY = 'pluginsAccess.nav.plugins';
const ADMIN_PLUGINS_NAV_KEY = 'pluginsAccess.nav.adminPlugins';

const USER_PLUGIN_PERMISSIONS: Permission[] = [
  Permission.PLUGINS_USE,
  Permission.PLUGINS_INSTALL,
  Permission.PLUGINS_MANAGE_OWN_SERVERS,
];

const canWith =
  (permissions: Permission[]) =>
  (permission: Permission): boolean =>
    permissions.includes(permission);
const allFeatures = (): boolean => true;
const noFeatures = (): boolean => false;
const onlyPlugins = (feature: PlanFeature): boolean => feature === PlanFeature.ALLOW_PLUGINS;

const labelKeys = (items: { labelKey: string }[]): string[] => items.map((item) => item.labelKey);

describe('plugins route requirements', () => {
  it('gates /plugins on PLUGINS_USE and the allowPlugins plan feature', () => {
    expect(requiredRequirementForPath(ROUTES.PLUGINS)).toEqual({
      permission: Permission.PLUGINS_USE,
      feature: PlanFeature.ALLOW_PLUGINS,
    });
  });

  it('covers the detail page under /plugins', () => {
    const required = requiredRequirementForPath('/plugins/web-fetch');
    expect(required?.permission).toBe(Permission.PLUGINS_USE);
    expect(required?.feature).toBe(PlanFeature.ALLOW_PLUGINS);
  });

  it('gates /admin/plugins on PLUGINS_ADMIN, not on the /admin catch-all', () => {
    const required = requiredRequirementForPath(ROUTES.ADMIN_PLUGINS);
    expect(required?.permission).toBe(Permission.PLUGINS_ADMIN);
    expect(required?.feature).toBeUndefined();
  });

  it('lists /admin/plugins before the /admin catch-all so the longer prefix wins', () => {
    const prefixes = ROUTE_PERMISSIONS.map((entry) => entry.prefix);
    expect(prefixes.indexOf(ROUTES.ADMIN_PLUGINS)).toBeGreaterThanOrEqual(0);
    expect(prefixes.indexOf(ROUTES.ADMIN_PLUGINS)).toBeLessThan(prefixes.indexOf(ROUTES.ADMIN));
  });

  it('does not match a path that merely shares the /plugins prefix string', () => {
    expect(requiredRequirementForPath('/pluginsX')).toBeNull();
  });
});

describe('plugins sidebar visibility', () => {
  it('shows a USER with the default grants and the plan gate the Plugins entry', () => {
    const visible = filterSidebarItems(
      SIDEBAR_NAV_ITEMS,
      canWith(USER_PLUGIN_PERMISSIONS),
      onlyPlugins,
    );
    expect(labelKeys(visible)).toContain(PLUGINS_NAV_KEY);
  });

  it('shows the entry on Free: the gate is on for every plan', () => {
    // A Free plan carries allowPlugins true; nothing else about the plan matters here.
    const visible = filterSidebarItems(
      SIDEBAR_NAV_ITEMS,
      canWith([Permission.PLUGINS_USE]),
      onlyPlugins,
    );
    expect(labelKeys(visible)).toContain(PLUGINS_NAV_KEY);
  });

  it('hides the entry from a USER whose role lost PLUGINS_USE', () => {
    const visible = filterSidebarItems(
      SIDEBAR_NAV_ITEMS,
      canWith([Permission.PLUGINS_INSTALL, Permission.PLUGINS_MANAGE_OWN_SERVERS]),
      allFeatures,
    );
    expect(labelKeys(visible)).not.toContain(PLUGINS_NAV_KEY);
  });

  it('hides the entry when the plan gate is off even with the permission', () => {
    const visible = filterSidebarItems(
      SIDEBAR_NAV_ITEMS,
      canWith(USER_PLUGIN_PERMISSIONS),
      noFeatures,
    );
    expect(labelKeys(visible)).not.toContain(PLUGINS_NAV_KEY);
  });

  it('keeps the admin console out of a USER sidebar', () => {
    const visible = filterSidebarItems(
      SIDEBAR_NAV_ITEMS,
      canWith(USER_PLUGIN_PERMISSIONS),
      allFeatures,
    );
    const admin = visible.find((item) => item.labelKey === 'nav.admin');
    expect(admin).toBeUndefined();
    expect(JSON.stringify(visible)).not.toContain(ADMIN_PLUGINS_NAV_KEY);
  });

  it('shows the admin plugins link to an administrator holding PLUGINS_ADMIN', () => {
    const visible = filterSidebarItems(
      SIDEBAR_NAV_ITEMS,
      () => true,
      () => true,
    );
    const admin = visible.find((item) => item.labelKey === 'nav.admin');
    expect(admin).toBeDefined();
    expect(labelKeys(admin?.children ?? [])).toContain(ADMIN_PLUGINS_NAV_KEY);
    const entry = admin?.children?.find((child) => child.labelKey === ADMIN_PLUGINS_NAV_KEY);
    expect(entry?.href).toBe(ROUTES.ADMIN_PLUGINS);
  });

  it('gates /admin/plugins on PLUGINS_ADMIN, before the /admin catch-all', () => {
    expect(requiredRequirementForPath(ROUTES.ADMIN_PLUGINS)).toEqual({
      permission: Permission.PLUGINS_ADMIN,
    });
  });

  it('covers the Installed page under /plugins with the same requirement', () => {
    expect(requiredRequirementForPath(ROUTES.PLUGINS_INSTALLED)).toEqual({
      permission: Permission.PLUGINS_USE,
      feature: PlanFeature.ALLOW_PLUGINS,
    });
  });

  it('keeps the admin plugins link out for an Admin-area user who lacks PLUGINS_ADMIN', () => {
    const visible = filterSidebarItems(
      SIDEBAR_NAV_ITEMS,
      canWith([Permission.ADMIN_USERS_MANAGE, Permission.PLUGINS_USE]),
      allFeatures,
    );
    const admin = visible.find((item) => item.labelKey === 'nav.admin');
    expect(admin).toBeDefined();
    expect(labelKeys(admin?.children ?? [])).not.toContain(ADMIN_PLUGINS_NAV_KEY);
  });
});
