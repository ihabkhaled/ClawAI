import { Permission, UserRole } from '@claw/shared-types';

// Default permission grants used to SEED the system roles. After seeding, the
// grants live in the role_permissions table and are admin-editable — this
// constant is only the starting point, not the runtime source of truth.

// Every permission in the catalog (ADMIN baseline).
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

// Minimal self-service surface for self-registered USERs: Chat, their own
// Workspace connectors, the Desktop Agent (still plan-gated), the
// model-read permission the chat model-picker needs, and the Research
// feature gate (search / fetch / extract used by the compare-mode research
// enricher). Everything else (model/connector/routing config, the Memory &
// Context management pages, Files, observability, admin) is withheld by
// default and can be granted per-role by an admin in the role→permission
// matrix.
// NOTE: MODEL_USE_ALLOWED gates only the model-LIST read endpoints the chat
// picker calls — NOT the /models management pages (MODELS_CATALOG_VIEW).
//
// The 9 orchestration-lab *_USE permissions follow COMPARE_USE/JUDGE_USE's
// pattern, not the deprecated ROUTER_USE's: granted broadly at the role
// layer so a USER role is never blocked here, with the PLAN's allowXxx
// feature gate (see PlanFeatureGates) doing the actual per-tier gating —
// same two-layer shape every other plan-gated feature already uses.
export const USER_DEFAULT_PERMISSIONS: Permission[] = [
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
  Permission.RESEARCH_USE,
  Permission.COMPARE_USE,
  Permission.JUDGE_USE,
  Permission.FILES_USE,
  Permission.CONSENSUS_MODE_USE,
  Permission.ESCALATION_CHAIN_USE,
  Permission.REPAIR_LAB_USE,
  Permission.TASK_DECOMPOSER_USE,
  Permission.BEST_OF_N_USE,
  Permission.VERIFIER_USE,
  Permission.PIPELINE_LAB_USE,
  Permission.COST_ENSEMBLE_USE,
  Permission.ROLE_PACK_USE,
  Permission.FEEDBACK_SUBMIT,
  // Buying PAYG credit is self-service, like every other USER grant here. The
  // credit PACKAGE list is gated on this permission because that list is the
  // purchase entry point — without the grant the top-up page would render an
  // empty card rather than a locked one. ADMIN_CREDIT_MANAGE is deliberately
  // NOT here: adjusting someone's balance is an operator action.
  Permission.BILLING_CREDIT_TOPUP,
  // Workspace sub-pages: granted by default because WORKSPACE_VIEW already
  // lets a USER reach them, and adding granularity must not quietly take a
  // feature away. Research, Routing and Models sub-pages are NOT here: those
  // pages are admin-only today (ADMIN_SYSTEM_VIEW / ADMIN_ROUTING_MANAGE /
  // MODELS_CATALOG_VIEW), and granting them would have handed admin
  // observability to every normal user.
  Permission.WORKSPACE_AUTOMATIONS_VIEW,
  Permission.WORKSPACE_INBOX_VIEW,
  Permission.WORKSPACE_SEMANTIC_SEARCH_USE,
  Permission.WORKSPACE_DIGEST_VIEW,
  Permission.WORKSPACE_ACTIONS_VIEW,
  Permission.WORKSPACE_APPROVALS_MANAGE,
  Permission.WORKSPACE_AUTOMATION_PREFERENCES_MANAGE,
  Permission.WORKSPACE_EMAIL_SIGNATURES_MANAGE,
  Permission.WORKSPACE_EMAIL_TEMPLATES_MANAGE,
  Permission.WORKSPACE_IMPL_HANDOFFS_VIEW,
  Permission.WORKSPACE_GMAIL_VIEW,
  Permission.WORKSPACE_JIRA_VIEW,
  Permission.WORKSPACE_SOURCE_CONTROL_VIEW,
  Permission.WORKSPACE_SLACK_VIEW,
  Permission.WORKSPACE_DOCS_VIEW,
  Permission.WORKSPACE_CONFLUENCE_VIEW,
  Permission.WORKSPACE_FIGMA_VIEW,
  Permission.WORKSPACE_WORKFLOWS_VIEW,
];

// Slugs of the two system roles. Slugs intentionally equal the UserRole enum
// values so the JWT `role` claim (enum) and the Role.slug stay interchangeable
// for the existing RolesGuard.
export const SYSTEM_ROLE_ADMIN_SLUG = UserRole.ADMIN;
export const SYSTEM_ROLE_USER_SLUG = UserRole.USER;

export const SYSTEM_ROLE_SEED: Array<{
  slug: string;
  name: string;
  description: string;
  permissions: Permission[];
}> = [
  {
    slug: SYSTEM_ROLE_ADMIN_SLUG,
    name: 'Administrator',
    description: 'Full platform access. Bypasses plan, quota and model gates.',
    permissions: ALL_PERMISSIONS,
  },
  {
    slug: SYSTEM_ROLE_USER_SLUG,
    name: 'User',
    description: 'Self-service product access scoped to the user’s own data.',
    permissions: USER_DEFAULT_PERMISSIONS,
  },
];
