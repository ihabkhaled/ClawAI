import { Permission, PlanFeature } from '@/enums';
import type { RoutePermission } from '@/types';

import { ROUTES } from './routes.constants';

// Maps route prefixes to the Permission and/or PlanFeature required to view
// the page. Ordered LONGEST-PREFIX-FIRST so requiredRequirementForPath returns
// the most specific match. A route lacking any entry here is open to all
// authenticated users. The backend remains the authoritative enforcer — this
// only gates the UI. ADMIN bypasses every requirement.
export const ROUTE_PERMISSIONS: ReadonlyArray<RoutePermission> = [
  // Admin specific pages (MUST precede the /admin catch-all below).
  { prefix: ROUTES.ADMIN_USERS, permission: Permission.ADMIN_USERS_MANAGE },
  { prefix: ROUTES.ADMIN_FEEDBACK, permission: Permission.ADMIN_FEEDBACK_MANAGE },
  {
    prefix: ROUTES.ADMIN_AI_ACTION_POLICIES,
    permission: Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
  },
  {
    prefix: ROUTES.ADMIN_SUGGESTION_RULES,
    permission: Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
  },
  { prefix: ROUTES.ADMIN_WEBHOOK_DELIVERIES, permission: Permission.ADMIN_SYSTEM_VIEW },
  { prefix: ROUTES.ADMIN_DEPLOYMENT, permission: Permission.ADMIN_SYSTEM_VIEW },
  // Reuses the routing-service's existing ADMIN_ROUTING_MANAGE permission —
  // the router-configuration-admin API is gated by the same permission as
  // /routing itself (see ROUTES.ROUTING below), no new permission needed.
  // MUST precede ADMIN_SMART_ROUTER — it is a longer prefix under it, and the
  // list resolves longest-first. Gated on ADMIN_MODELS_MANAGE rather than the
  // parent's ADMIN_ROUTING_MANAGE so the UI matches what
  // /router-models/costs actually enforces; a routing manager without the
  // models permission would otherwise reach a page that 403s on every call.
  { prefix: ROUTES.ADMIN_MODEL_COSTS, permission: Permission.ADMIN_MODELS_MANAGE },
  { prefix: ROUTES.ADMIN_SMART_ROUTER, permission: Permission.ADMIN_ROUTING_MANAGE },
  { prefix: ROUTES.ADMIN_REFUNDS, permission: Permission.ADMIN_PLANS_MANAGE },
  { prefix: ROUTES.ADMIN_BILLING, permission: Permission.ADMIN_PLANS_MANAGE },
  { prefix: ROUTES.ADMIN_PAYMENT_GATEWAYS, permission: Permission.ADMIN_PLANS_MANAGE },
  { prefix: ROUTES.ADMIN_PLANS, permission: Permission.ADMIN_PLANS_MANAGE },
  { prefix: ROUTES.ADMIN_ROLES, permission: Permission.ADMIN_PERMISSIONS_MANAGE },
  { prefix: '/admin/usage', permission: Permission.ADMIN_USAGE_VIEW },

  // Chat sub-pages (MUST precede the bare /chat which stays open).
  // Compare is PLAN-feature gated (allowCompareMode). Each of the 9
  // orchestration labs below has its OWN permission + plan-feature gate —
  // replaces the single coarse ROUTER_USE that used to cover all 9 with no
  // per-page or per-tier distinction (see Permission.ROUTER_USE for why that
  // enum member is kept, deprecated, rather than removed). None of these are
  // shared with the per-lane Judge or Critic toggles inside compare mode —
  // those keep their own plan-feature gates (allowJudgeMode /
  // allowCriticReview) and apply independently.
  { prefix: ROUTES.CHAT_COMPARE, feature: PlanFeature.ALLOW_COMPARE_MODE },
  {
    prefix: ROUTES.CHAT_VERIFY,
    permission: Permission.VERIFIER_USE,
    feature: PlanFeature.ALLOW_VERIFIER,
  },
  {
    prefix: ROUTES.CHAT_CONSENSUS,
    permission: Permission.CONSENSUS_MODE_USE,
    feature: PlanFeature.ALLOW_CONSENSUS_MODE,
  },
  {
    prefix: ROUTES.CHAT_ESCALATION,
    permission: Permission.ESCALATION_CHAIN_USE,
    feature: PlanFeature.ALLOW_ESCALATION_CHAIN,
  },
  {
    prefix: ROUTES.CHAT_REPAIR,
    permission: Permission.REPAIR_LAB_USE,
    feature: PlanFeature.ALLOW_REPAIR_LAB,
  },
  {
    prefix: ROUTES.CHAT_DECOMPOSE,
    permission: Permission.TASK_DECOMPOSER_USE,
    feature: PlanFeature.ALLOW_TASK_DECOMPOSER,
  },
  {
    prefix: ROUTES.CHAT_BEST_OF_N,
    permission: Permission.BEST_OF_N_USE,
    feature: PlanFeature.ALLOW_BEST_OF_N,
  },
  {
    prefix: ROUTES.CHAT_PIPELINE,
    permission: Permission.PIPELINE_LAB_USE,
    feature: PlanFeature.ALLOW_PIPELINE_LAB,
  },
  {
    prefix: ROUTES.CHAT_COST_ENSEMBLE,
    permission: Permission.COST_ENSEMBLE_USE,
    feature: PlanFeature.ALLOW_COST_ENSEMBLE,
  },
  {
    prefix: ROUTES.CHAT_ROLE_PACK,
    permission: Permission.ROLE_PACK_USE,
    feature: PlanFeature.ALLOW_ROLE_PACK,
  },

  // Top-level pages and admin landing catch-all.
  { prefix: ROUTES.DASHBOARD, permission: Permission.VIEW_DASHBOARD },
  { prefix: ROUTES.CONNECTORS, permission: Permission.ADMIN_CONNECTORS_MANAGE },
  { prefix: ROUTES.ROUTING, permission: Permission.ADMIN_ROUTING_MANAGE },
  { prefix: ROUTES.MODELS, permission: Permission.MODELS_CATALOG_VIEW },
  { prefix: ROUTES.MEMORY, permission: Permission.MEMORY_USE },
  { prefix: ROUTES.CONTEXT, permission: Permission.CONTEXT_PACK_READ_OWN },
  { prefix: ROUTES.FILES, permission: Permission.FILES_USE },
  // The /research/* PAGES (providers + runs) are admin observability and
  // stay hidden from normal users — they have RESEARCH_USE so the in-chat /
  // in-compare research selector works against the backend, but the standalone
  // Research section in the sidebar is admin-only. Backend research endpoints
  // remain gated by RESEARCH_USE (the page's own data, plus chat-service
  // service-to-service calls from the compare ResearchEnricher).
  { prefix: '/research', permission: Permission.ADMIN_SYSTEM_VIEW },
  // Workspace pages.
  // - /workspace/sync-health = ADMIN observability dashboard, stays admin-only.
  // - /workspace/app-configs = browse the admin-created OAuth app configs
  //   (sanitised — no client secrets returned). Members need this page to
  //   discover which provider apps are ready to connect their own account
  //   against; the create/edit/delete buttons are still hidden from non-admins
  //   in the UI, and the backend mutations stay locked to ADMIN +
  //   ADMIN_WORKSPACE_AUTOMATION_MANAGE.
  // - /workspace = the landing page listing each user's own connectors +
  //   their Connect button — open to anyone with WORKSPACE_VIEW.
  //
  // The /workspace/app-configs entry MUST precede the bare /workspace entry
  // so longest-prefix-first resolution picks the more specific gate.
  { prefix: ROUTES.WORKSPACE_SYNC_HEALTH, permission: Permission.ADMIN_WORKSPACES_VIEW },
  {
    prefix: ROUTES.WORKSPACE_APP_CONFIGS,
    permission: Permission.WORKSPACE_APP_CONFIG_VIEW,
  },
  { prefix: ROUTES.WORKSPACE, permission: Permission.WORKSPACE_VIEW },
  { prefix: ROUTES.OBSERVABILITY, permission: Permission.ADMIN_SYSTEM_VIEW },
  { prefix: ROUTES.AUDITS, permission: Permission.ADMIN_SYSTEM_VIEW },
  { prefix: ROUTES.LOGS, permission: Permission.ADMIN_LOGS_VIEW },
  { prefix: ROUTES.ADMIN, permission: Permission.ADMIN_USERS_MANAGE },
] as const;
