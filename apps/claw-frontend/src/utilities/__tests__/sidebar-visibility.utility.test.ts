import { describe, expect, it } from 'vitest';

import { SIDEBAR_NAV_ITEMS } from '@/constants';
import { Permission } from '@/enums';

import { filterSidebarItems } from '../sidebar-visibility.utility';

// Default normal-USER permission grant (mirrors the backend USER role).
const USER_PERMISSIONS: Permission[] = [
  Permission.CHAT_USE,
  Permission.CHAT_READ_OWN,
  Permission.CHAT_DELETE_OWN,
  Permission.WORKSPACE_CONNECT_OWN,
  Permission.WORKSPACE_READ_OWN,
  Permission.WORKSPACE_SYNC_OWN,
  Permission.WORKSPACE_ACTION_OWN,
  Permission.MODEL_USE_ALLOWED,
  Permission.AGENT_USE,
];

const userCan =
  (permissions: Permission[]) =>
  (p: Permission): boolean =>
    permissions.includes(p);
const adminCan = (): boolean => true;

const labelKeys = (items: { labelKey: string }[]): string[] => items.map((i) => i.labelKey);

describe('sidebar-visibility.utility', () => {
  describe('filterSidebarItems for a normal USER', () => {
    const visible = filterSidebarItems(SIDEBAR_NAV_ITEMS, userCan(USER_PERMISSIONS));
    const visibleKeys = labelKeys(visible);

    it('keeps chat, workspace, agent, and account pages', () => {
      expect(visibleKeys).toContain('nav.chat');
      expect(visibleKeys).toContain('nav.workspace');
      expect(visibleKeys).toContain('nav.agent');
      expect(visibleKeys).toContain('nav.plan');
      expect(visibleKeys).toContain('nav.usage');
      expect(visibleKeys).toContain('nav.settings');
    });

    it('hides connectors, routing, models, memory, context, files, and admin', () => {
      expect(visibleKeys).not.toContain('nav.connectors');
      expect(visibleKeys).not.toContain('nav.routing');
      expect(visibleKeys).not.toContain('nav.models');
      expect(visibleKeys).not.toContain('nav.memory');
      expect(visibleKeys).not.toContain('nav.context');
      expect(visibleKeys).not.toContain('nav.files');
      expect(visibleKeys).not.toContain('nav.research');
      expect(visibleKeys).not.toContain('nav.audits');
      expect(visibleKeys).not.toContain('nav.logs');
      expect(visibleKeys).not.toContain('nav.observability');
      expect(visibleKeys).not.toContain('nav.admin');
      expect(visibleKeys).not.toContain('nav.dashboard');
    });

    it('keeps the open Chat parent but strips its gated lab children', () => {
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      expect(chat).toBeDefined();
      expect(chat?.children).toEqual([]);
    });

    it('keeps the open Workspace parent with all its open children', () => {
      const workspace = visible.find((i) => i.labelKey === 'nav.workspace');
      const original = SIDEBAR_NAV_ITEMS.find((i) => i.labelKey === 'nav.workspace');
      expect(workspace?.children?.length).toBe(original?.children?.length);
    });
  });

  describe('filterSidebarItems for an ADMIN', () => {
    it('keeps every top-level item and every child (admin can do all)', () => {
      const visible = filterSidebarItems(SIDEBAR_NAV_ITEMS, adminCan);
      expect(visible.length).toBe(SIDEBAR_NAV_ITEMS.length);

      const admin = visible.find((i) => i.labelKey === 'nav.admin');
      const originalAdmin = SIDEBAR_NAV_ITEMS.find((i) => i.labelKey === 'nav.admin');
      expect(admin?.children?.length).toBe(originalAdmin?.children?.length);
    });
  });

  describe('filterSidebarItems with a child-only permission', () => {
    it('reveals a gated chat lab child when the user holds the lab permission', () => {
      const visible = filterSidebarItems(
        SIDEBAR_NAV_ITEMS,
        userCan([...USER_PERMISSIONS, Permission.COMPARE_USE]),
      );
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      expect(labelKeys(chat?.children ?? [])).toContain('nav.compareModels');
      // Lab children that still require ROUTER_USE/JUDGE_USE stay hidden.
      expect(labelKeys(chat?.children ?? [])).not.toContain('nav.consensusMode');
      expect(labelKeys(chat?.children ?? [])).not.toContain('nav.verifierLab');
    });
  });
});
