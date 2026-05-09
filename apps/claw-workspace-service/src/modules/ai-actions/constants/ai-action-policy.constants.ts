import { AiActionPolicyKind } from '../../../common/enums/ai-action-policy-kind.enum';
import { AiActionRiskLabel } from '../../../common/enums/ai-action-risk-label.enum';

export type DefaultAiActionPolicy = {
  name: string;
  kind: AiActionPolicyKind;
  description: string;
  providerRegex: string;
  actionKindRegex: string;
  riskMaxLabel: AiActionRiskLabel;
  riskMaxScore: number;
  priority: number;
  requireReason: boolean;
};

// Default-strict 13 policies seeded on first install. Idempotent on restart via
// upsert keyed by name. Mirrors the agent-service pattern from
// `apps/claw-agent-service/src/common/constants/policy.constants.ts`.
export const DEFAULT_AI_ACTION_POLICIES: DefaultAiActionPolicy[] = [
  // === DENY rules (always block at draft time) ===
  {
    name: 'deny-pii-leakage',
    kind: AiActionPolicyKind.DENY,
    description:
      'Blocks any draft whose body contains a credit-card, SSN, AWS key, JWT, or other secret pattern',
    providerRegex: '.*',
    actionKindRegex: '.*',
    riskMaxLabel: AiActionRiskLabel.CRITICAL,
    riskMaxScore: 100,
    priority: 1000,
    requireReason: false,
  },
  {
    // IMPL_PROMPT is never AUTO_APPROVED because there is no AUTO_APPROVE policy
    // matching `^IMPL_PROMPT$` in the seed; the policy matcher returns ALLOW
    // (PENDING_APPROVAL) by default. This rule additionally hard-denies IMPL_PROMPT
    // when the risk scorer has flagged it (secret pattern, high score) so it never
    // even reaches the queue for human review — the secret scanner is the
    // discriminator, this policy enforces the deny-floor on top.
    name: 'deny-impl-prompt-auto-approve',
    kind: AiActionPolicyKind.DENY,
    description:
      'IMPL_PROMPT drafts that the risk scorer flags HIGH+ (secret patterns) are hard-denied; otherwise IMPL_PROMPT routes to PENDING_APPROVAL via the default ALLOW chain',
    providerRegex: '.*',
    actionKindRegex: '^IMPL_PROMPT$',
    riskMaxLabel: AiActionRiskLabel.HIGH,
    riskMaxScore: 80,
    priority: 999,
    requireReason: false,
  },
  // === ALLOW rules (default — flag for human review; never auto-execute) ===
  {
    name: 'allow-customer-facing-default',
    kind: AiActionPolicyKind.ALLOW,
    description:
      'Default rule for customer-facing actions: requires explicit human review, even for low-risk drafts',
    providerRegex: '^(GMAIL|SLACK)$',
    actionKindRegex: '^(DRAFT|SUMMARIZE|REWRITE)$',
    riskMaxLabel: AiActionRiskLabel.HIGH,
    riskMaxScore: 80,
    priority: 600,
    requireReason: false,
  },
  {
    name: 'allow-write-action-default',
    kind: AiActionPolicyKind.ALLOW,
    description: 'Default rule for write actions on external systems: human review required',
    providerRegex: '.*',
    actionKindRegex: '^(EXECUTE|WRITE).*',
    riskMaxLabel: AiActionRiskLabel.HIGH,
    riskMaxScore: 80,
    priority: 550,
    requireReason: false,
  },
  {
    name: 'allow-high-risk-require-reason',
    kind: AiActionPolicyKind.ALLOW,
    description: 'HIGH/CRITICAL drafts require a typed reason if rejected',
    providerRegex: '.*',
    actionKindRegex: '.*',
    riskMaxLabel: AiActionRiskLabel.CRITICAL,
    riskMaxScore: 100,
    priority: 500,
    requireReason: true,
  },
  {
    name: 'allow-default-strict',
    kind: AiActionPolicyKind.ALLOW,
    description: 'Final fallback: any unmatched draft requires explicit approval',
    providerRegex: '.*',
    actionKindRegex: '.*',
    riskMaxLabel: AiActionRiskLabel.HIGH,
    riskMaxScore: 80,
    priority: 100,
    requireReason: false,
  },
  // === AUTO_APPROVE rules (opt-in; admin-tunable; only LOW risk by default) ===
  {
    name: 'auto-approve-summarize-internal-jira',
    kind: AiActionPolicyKind.AUTO_APPROVE,
    description: 'Internal Jira ticket summaries auto-approve at LOW risk',
    providerRegex: '^JIRA$',
    actionKindRegex: '^SUMMARIZE$',
    riskMaxLabel: AiActionRiskLabel.LOW,
    riskMaxScore: 30,
    priority: 400,
    requireReason: false,
  },
  {
    name: 'auto-approve-summarize-internal-confluence',
    kind: AiActionPolicyKind.AUTO_APPROVE,
    description: 'Confluence page summaries auto-approve at LOW risk',
    providerRegex: '^CONFLUENCE$',
    actionKindRegex: '^SUMMARIZE$',
    riskMaxLabel: AiActionRiskLabel.LOW,
    riskMaxScore: 30,
    priority: 400,
    requireReason: false,
  },
  {
    name: 'auto-approve-summarize-github-issue',
    kind: AiActionPolicyKind.AUTO_APPROVE,
    description: 'GitHub Issue summaries auto-approve at LOW risk',
    providerRegex: '^GITHUB$',
    actionKindRegex: '^SUMMARIZE$',
    riskMaxLabel: AiActionRiskLabel.LOW,
    riskMaxScore: 30,
    priority: 400,
    requireReason: false,
  },
  {
    name: 'auto-approve-extract-action-items',
    kind: AiActionPolicyKind.AUTO_APPROVE,
    description: 'Extract action items from internal docs auto-approve at LOW risk',
    providerRegex: '^(JIRA|CONFLUENCE|GOOGLE_DRIVE|MICROSOFT_SHAREPOINT|MICROSOFT_ONEDRIVE)$',
    actionKindRegex: '^EXTRACT$',
    riskMaxLabel: AiActionRiskLabel.LOW,
    riskMaxScore: 30,
    priority: 400,
    requireReason: false,
  },
  {
    name: 'auto-approve-estimate-low-risk',
    kind: AiActionPolicyKind.AUTO_APPROVE,
    description: 'Stream 41 ESTIMATE actions auto-approve at LOW risk only',
    providerRegex: '^(JIRA|GITHUB|GITLAB|CLICKUP)$',
    actionKindRegex: '^ESTIMATE$',
    riskMaxLabel: AiActionRiskLabel.LOW,
    riskMaxScore: 30,
    priority: 400,
    requireReason: false,
  },
  {
    name: 'auto-approve-judge-low-risk',
    kind: AiActionPolicyKind.AUTO_APPROVE,
    description: 'JUDGE actions on internal content auto-approve at LOW risk',
    providerRegex: '.*',
    actionKindRegex: '^JUDGE$',
    riskMaxLabel: AiActionRiskLabel.LOW,
    riskMaxScore: 30,
    priority: 350,
    requireReason: false,
  },
  {
    name: 'auto-approve-compare-low-risk',
    kind: AiActionPolicyKind.AUTO_APPROVE,
    description: 'COMPARE actions auto-approve at LOW risk',
    providerRegex: '.*',
    actionKindRegex: '^COMPARE$',
    riskMaxLabel: AiActionRiskLabel.LOW,
    riskMaxScore: 30,
    priority: 350,
    requireReason: false,
  },
  {
    name: 'auto-approve-plan-low-risk',
    kind: AiActionPolicyKind.AUTO_APPROVE,
    description: 'Stream 41 PLAN actions auto-approve at LOW risk on ticket providers',
    providerRegex: '^(JIRA|GITHUB|GITLAB|CLICKUP)$',
    actionKindRegex: '^PLAN$',
    riskMaxLabel: AiActionRiskLabel.LOW,
    riskMaxScore: 30,
    priority: 380,
    requireReason: false,
  },
  {
    name: 'auto-approve-decompose-low-risk',
    kind: AiActionPolicyKind.AUTO_APPROVE,
    description:
      'Stream 41 DECOMPOSE actions auto-approve at LOW risk on ticket providers (subtask creation still needs separate approval)',
    providerRegex: '^(JIRA|GITHUB|GITLAB|CLICKUP)$',
    actionKindRegex: '^DECOMPOSE$',
    riskMaxLabel: AiActionRiskLabel.LOW,
    riskMaxScore: 30,
    priority: 380,
    requireReason: false,
  },
];

export const RISK_LEVEL_ORDER: Record<AiActionRiskLabel, number> = {
  [AiActionRiskLabel.LOW]: 0,
  [AiActionRiskLabel.MEDIUM]: 1,
  [AiActionRiskLabel.HIGH]: 2,
  [AiActionRiskLabel.CRITICAL]: 3,
};

export const RISK_SCORE_CRITICAL_THRESHOLD = 85;
export const RISK_SCORE_HIGH_THRESHOLD = 60;
export const RISK_SCORE_MEDIUM_THRESHOLD = 30;

// Stream 12.6 / 32.4 v1.1 — machine-readable reason codes recorded on the
// queue row when AiActionApprovalManager auto-denies the suggestion.
// Surfaced in the UI alongside the existing free-text rejectionReason.
export const AUTO_DENY_REASON = {
  USER_DISABLED: 'USER_DISABLED',
  PROVIDER_DISABLED: 'PROVIDER_DISABLED',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
} as const;

export type AutoDenyReason = (typeof AUTO_DENY_REASON)[keyof typeof AUTO_DENY_REASON];

export const HEURISTIC_BASE_SCORE = 5;
export const HEURISTIC_EXTERNAL_DOMAIN_SCORE = 25;
export const HEURISTIC_LONG_BODY_SCORE = 10;
export const HEURISTIC_LONG_BODY_THRESHOLD = 5000;
export const HEURISTIC_HTML_BODY_SCORE = 5;
export const HEURISTIC_MAX_SCORE = 100;

export const PII_PATTERNS: { name: string; pattern: string; score: number }[] = [
  // Credit card (PCI broad pattern; not Luhn-validated — false positives acceptable in v1)
  {
    name: 'credit-card',
    pattern: '\\b(?:\\d[ -]?){13,19}\\b',
    score: 60,
  },
  // SSN-like
  {
    name: 'ssn',
    pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
    score: 60,
  },
  // AWS Access Key
  {
    name: 'aws-access-key',
    pattern: '\\b(AKIA|ASIA)[0-9A-Z]{16}\\b',
    score: 100,
  },
  // GitHub PAT
  {
    name: 'github-pat',
    pattern: '\\bgh[pousr]_[A-Za-z0-9]{36,}\\b',
    score: 100,
  },
  // Slack token
  {
    name: 'slack-token',
    pattern: '\\bxox[baprs]-[A-Za-z0-9-]{10,}\\b',
    score: 100,
  },
  // JWT (3 dot-separated base64 segments)
  {
    name: 'jwt',
    pattern: '\\beyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\b',
    score: 90,
  },
  // Generic Bearer/secret prefix
  {
    name: 'bearer-secret',
    pattern: '(?:Bearer|api[_-]?key|secret|password)\\s*[:=]\\s*[A-Za-z0-9_\\-+/=]{16,}',
    score: 80,
  },
];

export const AI_ACTION_QUEUE_DEFAULT_EXPIRY_HOURS = 24;
export const AI_ACTION_RISK_AUTO_APPROVE_DEFAULT_MAX = 30;
export const AI_ACTION_QUEUE_EXPIRY_SWEEP_CRON = '0 */15 * * * *'; // every 15 minutes
export const AI_ACTION_QUEUE_EXPIRY_SWEEPER_LOCK_NAMESPACE = 'workspace.ai_action.queue_expiry';
export const AI_ACTION_QUEUE_EXPIRY_BATCH_LIMIT = 100;
