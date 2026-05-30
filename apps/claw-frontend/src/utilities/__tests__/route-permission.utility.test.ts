import { describe, expect, it } from 'vitest';

import { Permission, PlanFeature } from '@/enums';

import {
  requiredPermissionForPath,
  requiredRequirementForPath,
} from '../route-permission.utility';

describe('route-permission.utility', () => {
  describe('requiredPermissionForPath', () => {
    it('returns null for routes with no entry (open to all authed users)', () => {
      expect(requiredPermissionForPath('/chat')).toBeNull();
      expect(requiredPermissionForPath('/chat/abc-123')).toBeNull();
      expect(requiredPermissionForPath('/workspace')).toBeNull();
      expect(requiredPermissionForPath('/workspace/inbox')).toBeNull();
      expect(requiredPermissionForPath('/agent')).toBeNull();
      expect(requiredPermissionForPath('/agent/terminal')).toBeNull();
      expect(requiredPermissionForPath('/profile')).toBeNull();
      expect(requiredPermissionForPath('/settings')).toBeNull();
      expect(requiredPermissionForPath('/plan')).toBeNull();
      expect(requiredPermissionForPath('/usage')).toBeNull();
    });

    it('returns null for an unknown route', () => {
      expect(requiredPermissionForPath('/totally-unknown')).toBeNull();
      expect(requiredPermissionForPath('/')).toBeNull();
    });

    it('maps top-level gated routes to their permission', () => {
      expect(requiredPermissionForPath('/dashboard')).toBe(Permission.VIEW_DASHBOARD);
      expect(requiredPermissionForPath('/connectors')).toBe(Permission.ADMIN_CONNECTORS_MANAGE);
      expect(requiredPermissionForPath('/memory')).toBe(Permission.MEMORY_USE);
      expect(requiredPermissionForPath('/context')).toBe(Permission.CONTEXT_PACK_READ_OWN);
      expect(requiredPermissionForPath('/files')).toBe(Permission.FILES_USE);
      expect(requiredPermissionForPath('/observability')).toBe(Permission.ADMIN_SYSTEM_VIEW);
      expect(requiredPermissionForPath('/audits')).toBe(Permission.ADMIN_SYSTEM_VIEW);
      expect(requiredPermissionForPath('/logs')).toBe(Permission.ADMIN_LOGS_VIEW);
    });

    it('covers all sub-pages of a prefixed route', () => {
      expect(requiredPermissionForPath('/routing')).toBe(Permission.ADMIN_ROUTING_MANAGE);
      expect(requiredPermissionForPath('/routing/replay')).toBe(Permission.ADMIN_ROUTING_MANAGE);
      expect(requiredPermissionForPath('/routing/playground')).toBe(
        Permission.ADMIN_ROUTING_MANAGE,
      );
      expect(requiredPermissionForPath('/models')).toBe(Permission.MODELS_CATALOG_VIEW);
      expect(requiredPermissionForPath('/models/catalog')).toBe(Permission.MODELS_CATALOG_VIEW);
      expect(requiredPermissionForPath('/research')).toBe(Permission.RESEARCH_USE);
      expect(requiredPermissionForPath('/research/providers')).toBe(Permission.RESEARCH_USE);
      expect(requiredPermissionForPath('/research/runs')).toBe(Permission.RESEARCH_USE);
    });

    it('maps chat sub-pages to their lab permission while keeping /chat base open', () => {
      // Compare + Verify are now PLAN-feature gated, NOT permission gated, so
      // requiredPermissionForPath returns null for them. See the feature-gate
      // test block below for the parallel assertion.
      expect(requiredPermissionForPath('/chat/compare')).toBeNull();
      expect(requiredPermissionForPath('/chat/verify')).toBeNull();
      expect(requiredPermissionForPath('/chat/consensus')).toBe(Permission.ROUTER_USE);
      expect(requiredPermissionForPath('/chat/escalation')).toBe(Permission.ROUTER_USE);
      expect(requiredPermissionForPath('/chat/repair')).toBe(Permission.ROUTER_USE);
      expect(requiredPermissionForPath('/chat/decompose')).toBe(Permission.ROUTER_USE);
      expect(requiredPermissionForPath('/chat/best-of-n')).toBe(Permission.ROUTER_USE);
      expect(requiredPermissionForPath('/chat/pipeline')).toBe(Permission.ROUTER_USE);
      expect(requiredPermissionForPath('/chat/cost-ensemble')).toBe(Permission.ROUTER_USE);
      expect(requiredPermissionForPath('/chat/role-pack')).toBe(Permission.ROUTER_USE);
      // The bare /chat route remains open (no entry => null).
      expect(requiredPermissionForPath('/chat')).toBeNull();
    });

    it('longest-prefix wins: /admin/usage beats the /admin catch-all', () => {
      expect(requiredPermissionForPath('/admin/usage')).toBe(Permission.ADMIN_USAGE_VIEW);
      expect(requiredPermissionForPath('/admin/usage/details')).toBe(Permission.ADMIN_USAGE_VIEW);
      expect(requiredPermissionForPath('/admin')).toBe(Permission.ADMIN_USERS_MANAGE);
    });

    it('maps each specific admin page above the /admin catch-all', () => {
      expect(requiredPermissionForPath('/admin/plans')).toBe(Permission.ADMIN_PLANS_MANAGE);
      expect(requiredPermissionForPath('/admin/plans/new')).toBe(Permission.ADMIN_PLANS_MANAGE);
      expect(requiredPermissionForPath('/admin/roles')).toBe(Permission.ADMIN_PERMISSIONS_MANAGE);
      expect(requiredPermissionForPath('/admin/roles/r-1')).toBe(
        Permission.ADMIN_PERMISSIONS_MANAGE,
      );
      expect(requiredPermissionForPath('/admin/ai-action-policies')).toBe(
        Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
      );
      expect(requiredPermissionForPath('/admin/suggestion-rules')).toBe(
        Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
      );
      expect(requiredPermissionForPath('/admin/webhook-deliveries')).toBe(
        Permission.ADMIN_SYSTEM_VIEW,
      );
    });

    it('does not match a longer pathname that merely shares a prefix string', () => {
      // '/admin' must NOT match '/administration' (no slash boundary).
      expect(requiredPermissionForPath('/administration')).toBeNull();
      // '/files' must NOT match '/file-generations'.
      expect(requiredPermissionForPath('/file-generations')).toBeNull();
    });
  });

  describe('requiredRequirementForPath', () => {
    it('returns null for open routes', () => {
      expect(requiredRequirementForPath('/chat')).toBeNull();
      expect(requiredRequirementForPath('/totally-unknown')).toBeNull();
    });

    it('maps /chat/compare to the allowCompareMode plan feature (no permission)', () => {
      const req = requiredRequirementForPath('/chat/compare');
      expect(req).toEqual({ feature: PlanFeature.ALLOW_COMPARE_MODE });
      expect(req?.permission).toBeUndefined();
    });

    it('maps /chat/verify to the allowJudgeMode plan feature (no permission)', () => {
      const req = requiredRequirementForPath('/chat/verify');
      expect(req).toEqual({ feature: PlanFeature.ALLOW_JUDGE_MODE });
      expect(req?.permission).toBeUndefined();
    });

    it('maps a permission-gated route to its permission (no feature)', () => {
      const req = requiredRequirementForPath('/dashboard');
      expect(req).toEqual({ permission: Permission.VIEW_DASHBOARD });
      expect(req?.feature).toBeUndefined();
    });

    it('covers sub-pages of a feature-gated prefix', () => {
      const req = requiredRequirementForPath('/chat/compare/sub-path');
      expect(req).toEqual({ feature: PlanFeature.ALLOW_COMPARE_MODE });
    });
  });
});
