import { Permission } from '@/enums';
import type { RoutePermission } from '@/types';

import { ROUTES } from './routes.constants';

// Maps route prefixes to the Permission required to view the page. Ordered
// LONGEST-PREFIX-FIRST so requiredPermissionForPath returns the most specific
// match. A route lacking any entry here is open to all authenticated users.
// The backend remains the authoritative enforcer — this only gates the UI.
export const ROUTE_PERMISSIONS: ReadonlyArray<RoutePermission> = [
  // Admin specific pages (MUST precede the /admin catch-all below).
  {
    prefix: ROUTES.ADMIN_AI_ACTION_POLICIES,
    permission: Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
  },
  {
    prefix: ROUTES.ADMIN_SUGGESTION_RULES,
    permission: Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
  },
  { prefix: ROUTES.ADMIN_WEBHOOK_DELIVERIES, permission: Permission.ADMIN_SYSTEM_VIEW },
  { prefix: ROUTES.ADMIN_PLANS, permission: Permission.ADMIN_PLANS_MANAGE },
  { prefix: ROUTES.ADMIN_ROLES, permission: Permission.ADMIN_PERMISSIONS_MANAGE },
  { prefix: '/admin/usage', permission: Permission.ADMIN_USAGE_VIEW },

  // Chat sub-pages (MUST precede the bare /chat which stays open).
  { prefix: ROUTES.CHAT_COMPARE, permission: Permission.COMPARE_USE },
  { prefix: ROUTES.CHAT_VERIFY, permission: Permission.JUDGE_USE },
  { prefix: ROUTES.CHAT_CONSENSUS, permission: Permission.ROUTER_USE },
  { prefix: ROUTES.CHAT_ESCALATION, permission: Permission.ROUTER_USE },
  { prefix: ROUTES.CHAT_REPAIR, permission: Permission.ROUTER_USE },
  { prefix: ROUTES.CHAT_DECOMPOSE, permission: Permission.ROUTER_USE },
  { prefix: ROUTES.CHAT_BEST_OF_N, permission: Permission.ROUTER_USE },
  { prefix: ROUTES.CHAT_PIPELINE, permission: Permission.ROUTER_USE },
  { prefix: ROUTES.CHAT_COST_ENSEMBLE, permission: Permission.ROUTER_USE },
  { prefix: ROUTES.CHAT_ROLE_PACK, permission: Permission.ROUTER_USE },

  // Top-level pages and admin landing catch-all.
  { prefix: ROUTES.DASHBOARD, permission: Permission.VIEW_DASHBOARD },
  { prefix: ROUTES.CONNECTORS, permission: Permission.ADMIN_CONNECTORS_MANAGE },
  { prefix: ROUTES.ROUTING, permission: Permission.ADMIN_ROUTING_MANAGE },
  { prefix: ROUTES.MODELS, permission: Permission.MODELS_CATALOG_VIEW },
  { prefix: ROUTES.MEMORY, permission: Permission.MEMORY_USE },
  { prefix: ROUTES.CONTEXT, permission: Permission.CONTEXT_PACK_READ_OWN },
  { prefix: ROUTES.FILES, permission: Permission.FILES_USE },
  { prefix: '/research', permission: Permission.RESEARCH_USE },
  { prefix: ROUTES.OBSERVABILITY, permission: Permission.ADMIN_SYSTEM_VIEW },
  { prefix: ROUTES.AUDITS, permission: Permission.ADMIN_SYSTEM_VIEW },
  { prefix: ROUTES.LOGS, permission: Permission.ADMIN_LOGS_VIEW },
  { prefix: ROUTES.ADMIN, permission: Permission.ADMIN_USERS_MANAGE },
] as const;
