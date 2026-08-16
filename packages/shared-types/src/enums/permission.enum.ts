// Fixed permission catalog (Auth/RBAC/Plans flagship). Guards and UI reference
// these by name, so the catalog lives in code. The role→permission MAPPING is
// dynamic in the DB (RolePermission rows), editable by admins — only the set of
// possible permissions is fixed here.
export enum Permission {
  // Chat
  CHAT_USE = 'CHAT_USE',
  CHAT_READ_OWN = 'CHAT_READ_OWN',
  CHAT_DELETE_OWN = 'CHAT_DELETE_OWN',

  // Memory
  MEMORY_USE = 'MEMORY_USE',
  MEMORY_READ_OWN = 'MEMORY_READ_OWN',
  MEMORY_CREATE_OWN = 'MEMORY_CREATE_OWN',
  MEMORY_UPDATE_OWN = 'MEMORY_UPDATE_OWN',
  MEMORY_DELETE_OWN = 'MEMORY_DELETE_OWN',

  // Context packs
  CONTEXT_PACK_READ_OWN = 'CONTEXT_PACK_READ_OWN',
  CONTEXT_PACK_CREATE_OWN = 'CONTEXT_PACK_CREATE_OWN',
  CONTEXT_PACK_UPDATE_OWN = 'CONTEXT_PACK_UPDATE_OWN',
  CONTEXT_PACK_DELETE_OWN = 'CONTEXT_PACK_DELETE_OWN',

  // Workspace
  WORKSPACE_VIEW = 'WORKSPACE_VIEW',
  WORKSPACE_APP_CONFIG_VIEW = 'WORKSPACE_APP_CONFIG_VIEW',
  WORKSPACE_CONNECT_OWN = 'WORKSPACE_CONNECT_OWN',
  WORKSPACE_READ_OWN = 'WORKSPACE_READ_OWN',
  WORKSPACE_SYNC_OWN = 'WORKSPACE_SYNC_OWN',
  WORKSPACE_ACTION_OWN = 'WORKSPACE_ACTION_OWN',

  // Model / routing usage (plan-gated)
  MODEL_USE_ALLOWED = 'MODEL_USE_ALLOWED',
  // Deprecated: used to gate all 9 orchestration lab pages below as one
  // coarse permission. Kept (not removed) so any role an admin already
  // granted it to does not silently lose access — new code must use the
  // 9 granular *_USE permissions instead. Never grant this to new roles.
  ROUTER_USE = 'ROUTER_USE',
  COMPARE_USE = 'COMPARE_USE',
  JUDGE_USE = 'JUDGE_USE',

  // Advanced orchestration labs — one permission per page, each paired with
  // a matching Plan.allowXxx feature gate (see PlanFeatureGates). Replaces
  // the single coarse ROUTER_USE above.
  CONSENSUS_MODE_USE = 'CONSENSUS_MODE_USE',
  ESCALATION_CHAIN_USE = 'ESCALATION_CHAIN_USE',
  REPAIR_LAB_USE = 'REPAIR_LAB_USE',
  TASK_DECOMPOSER_USE = 'TASK_DECOMPOSER_USE',
  BEST_OF_N_USE = 'BEST_OF_N_USE',
  VERIFIER_USE = 'VERIFIER_USE',
  PIPELINE_LAB_USE = 'PIPELINE_LAB_USE',
  COST_ENSEMBLE_USE = 'COST_ENSEMBLE_USE',
  ROLE_PACK_USE = 'ROLE_PACK_USE',

  // Feature-page access (gate whole pages + their non-admin endpoints). These
  // let the role→permission matrix decide which product surfaces a role sees,
  // independently of the per-resource *_OWN write permissions above.
  FILES_USE = 'FILES_USE',
  RESEARCH_USE = 'RESEARCH_USE',
  AGENT_USE = 'AGENT_USE',
  MODELS_CATALOG_VIEW = 'MODELS_CATALOG_VIEW',
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',

  // Admin
  ADMIN_USERS_MANAGE = 'ADMIN_USERS_MANAGE',
  ADMIN_PLANS_MANAGE = 'ADMIN_PLANS_MANAGE',
  ADMIN_PERMISSIONS_MANAGE = 'ADMIN_PERMISSIONS_MANAGE',
  ADMIN_CONNECTORS_MANAGE = 'ADMIN_CONNECTORS_MANAGE',
  ADMIN_ROUTING_MANAGE = 'ADMIN_ROUTING_MANAGE',
  ADMIN_MODELS_MANAGE = 'ADMIN_MODELS_MANAGE',
  ADMIN_WORKSPACE_AUTOMATION_MANAGE = 'ADMIN_WORKSPACE_AUTOMATION_MANAGE',
  ADMIN_SYSTEM_VIEW = 'ADMIN_SYSTEM_VIEW',
  ADMIN_LOGS_VIEW = 'ADMIN_LOGS_VIEW',
  ADMIN_WORKSPACES_VIEW = 'ADMIN_WORKSPACES_VIEW',
  ADMIN_USAGE_VIEW = 'ADMIN_USAGE_VIEW',
}
