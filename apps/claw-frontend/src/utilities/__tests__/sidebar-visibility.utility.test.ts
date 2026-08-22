import { describe, expect, it } from 'vitest';

import { SIDEBAR_NAV_ITEMS } from '@/constants';
import { Permission, PlanFeature } from '@/enums';

import { filterSidebarItems } from '../sidebar-visibility.utility';

// Default normal-USER permission grant (mirrors the backend USER role).
const USER_PERMISSIONS: Permission[] = [
  Permission.CHAT_USE,
  Permission.CHAT_READ_OWN,
  Permission.CHAT_DELETE_OWN,
  Permission.WORKSPACE_VIEW,
  Permission.WORKSPACE_APP_CONFIG_VIEW,
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
const noFeatures = (): boolean => false;
const adminFeatures = (): boolean => true;
const featuresFromSet =
  (features: PlanFeature[]) =>
  (f: PlanFeature): boolean =>
    features.includes(f);

const labelKeys = (items: { labelKey: string }[]): string[] => items.map((i) => i.labelKey);

describe('sidebar-visibility.utility', () => {
  describe('filterSidebarItems for a normal USER with no plan features unlocked', () => {
    const visible = filterSidebarItems(SIDEBAR_NAV_ITEMS, userCan(USER_PERMISSIONS), noFeatures);
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

    it('keeps the open Chat parent but strips its gated lab children (no features)', () => {
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      expect(chat).toBeDefined();
      // Compare + Verify are PLAN-feature gated and the test user has no
      // unlocked features, so they MUST be hidden alongside the existing
      // permission-gated lab children.
      const childLabels = labelKeys(chat?.children ?? []);
      expect(childLabels).not.toContain('nav.compareModels');
      expect(childLabels).not.toContain('nav.verifierLab');
    });

    it('keeps the open Workspace parent + member-visible children (app-configs + others)', () => {
      const workspace = visible.find((i) => i.labelKey === 'nav.workspace');
      const childLabels = (workspace?.children ?? []).map((c) => c.labelKey);
      // Member keeps usage children (connect/use own accounts)...
      expect(childLabels).toContain('nav.workspaceInbox');
      // ...AND can browse the admin-created app configs (sanitised list — no
      // secrets returned) so they can connect their own account against a
      // provider; mutation buttons are hidden in-page by usePermissions().
      expect(childLabels).toContain('nav.workspaceAppConfigs');
      // The sync-health dashboard remains admin-only.
      expect(childLabels).not.toContain('nav.workspaceSyncHealth');
    });
  });

  describe('filterSidebarItems for an ADMIN', () => {
    it('contains one payment gateways navigation item', () => {
      const admin = SIDEBAR_NAV_ITEMS.find((item) => item.labelKey === 'nav.admin');
      const paymentGatewayItems = (admin?.children ?? []).filter(
        (item) => item.labelKey === 'nav.adminPaymentGateways',
      );

      expect(paymentGatewayItems).toHaveLength(1);
    });

    it('hides the deployment monitor from an ordinary administrator and ensures first child is nav.adminUsers', () => {
      const visible = filterSidebarItems(SIDEBAR_NAV_ITEMS, adminCan, adminFeatures);
      expect(visible.length).toBe(SIDEBAR_NAV_ITEMS.length);

      const admin = visible.find((i) => i.labelKey === 'nav.admin');
      expect(admin).toBeDefined();
      const adminChildren = admin?.children ?? [];
      expect(adminChildren.length).toBeGreaterThan(0);
      expect(adminChildren[0]?.labelKey).toBe('nav.adminUsers');
      expect(labelKeys(adminChildren)).not.toContain('nav.adminDeployment');
    });

    it('reveals the deployment monitor only to the seeded super administrator', () => {
      const visible = filterSidebarItems(SIDEBAR_NAV_ITEMS, adminCan, adminFeatures, true);
      const admin = visible.find((i) => i.labelKey === 'nav.admin');

      expect(labelKeys(admin?.children ?? [])).toContain('nav.adminDeployment');
    });

    it('reveals Compare and Verify children for admin even with no features bypass needed', () => {
      const visible = filterSidebarItems(SIDEBAR_NAV_ITEMS, adminCan, adminFeatures);
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      const childLabels = labelKeys(chat?.children ?? []);
      expect(childLabels).toContain('nav.compareModels');
      expect(childLabels).toContain('nav.verifierLab');
    });
  });

  describe('filterSidebarItems with plan-feature gating', () => {
    it('reveals nav.compareModels when allowCompareMode is unlocked for the user', () => {
      const visible = filterSidebarItems(
        SIDEBAR_NAV_ITEMS,
        userCan(USER_PERMISSIONS),
        featuresFromSet([PlanFeature.ALLOW_COMPARE_MODE]),
      );
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      const childLabels = labelKeys(chat?.children ?? []);
      expect(childLabels).toContain('nav.compareModels');
      expect(childLabels).not.toContain('nav.verifierLab');
    });

    it('does NOT reveal nav.verifierLab when only allowJudgeMode is unlocked', () => {
      // Verifier is gated by its OWN permission (VERIFIER_USE) + plan
      // feature (allowVerifier), independent of the per-lane Judge / Critic
      // toggles which keep their allowJudgeMode / allowCriticReview /
      // JUDGE_USE gates. Unlocking allowJudgeMode alone therefore does NOT
      // make the standalone Verifier Lab visible — neither its permission
      // nor its feature is present here.
      const visible = filterSidebarItems(
        SIDEBAR_NAV_ITEMS,
        userCan(USER_PERMISSIONS),
        featuresFromSet([PlanFeature.ALLOW_JUDGE_MODE]),
      );
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      const childLabels = labelKeys(chat?.children ?? []);
      expect(childLabels).not.toContain('nav.verifierLab');
      expect(childLabels).not.toContain('nav.compareModels');
    });

    it('hides both Compare and Verify when the plan unlocks neither feature', () => {
      const visible = filterSidebarItems(SIDEBAR_NAV_ITEMS, userCan(USER_PERMISSIONS), noFeatures);
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      const childLabels = labelKeys(chat?.children ?? []);
      expect(childLabels).not.toContain('nav.compareModels');
      expect(childLabels).not.toContain('nav.verifierLab');
    });
  });

  describe('filterSidebarItems with a per-page lab permission + feature', () => {
    it('granting only the permission (no feature) keeps every lab hidden', () => {
      const visible = filterSidebarItems(
        SIDEBAR_NAV_ITEMS,
        userCan([...USER_PERMISSIONS, Permission.CONSENSUS_MODE_USE, Permission.VERIFIER_USE]),
        noFeatures,
      );
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      expect(labelKeys(chat?.children ?? [])).not.toContain('nav.consensusMode');
      expect(labelKeys(chat?.children ?? [])).not.toContain('nav.verifierLab');
    });

    it('granting only the feature (no permission) keeps every lab hidden', () => {
      const visible = filterSidebarItems(
        SIDEBAR_NAV_ITEMS,
        userCan(USER_PERMISSIONS),
        featuresFromSet([PlanFeature.ALLOW_CONSENSUS_MODE, PlanFeature.ALLOW_VERIFIER]),
      );
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      expect(labelKeys(chat?.children ?? [])).not.toContain('nav.consensusMode');
      expect(labelKeys(chat?.children ?? [])).not.toContain('nav.verifierLab');
    });

    it('reveals only the specific lab that has BOTH its permission and its feature — siblings stay hidden', () => {
      const visible = filterSidebarItems(
        SIDEBAR_NAV_ITEMS,
        userCan([...USER_PERMISSIONS, Permission.CONSENSUS_MODE_USE]),
        featuresFromSet([PlanFeature.ALLOW_CONSENSUS_MODE]),
      );
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      const childLabels = labelKeys(chat?.children ?? []);
      expect(childLabels).toContain('nav.consensusMode');
      // Verifier has neither its permission nor its feature here.
      expect(childLabels).not.toContain('nav.verifierLab');
      expect(childLabels).not.toContain('nav.compareModels');
    });

    it('the deprecated ROUTER_USE permission no longer reveals any lab', () => {
      const visible = filterSidebarItems(
        SIDEBAR_NAV_ITEMS,
        userCan([...USER_PERMISSIONS, Permission.ROUTER_USE]),
        adminFeatures,
      );
      const chat = visible.find((i) => i.labelKey === 'nav.chat');
      const childLabels = labelKeys(chat?.children ?? []);
      expect(childLabels).not.toContain('nav.consensusMode');
      expect(childLabels).not.toContain('nav.verifierLab');
    });
  });
});
