import { PolicyKind } from '../enums/policy-kind.enum';
import { RiskLabel } from '../enums/risk-label.enum';

export type DefaultPolicyDefinition = {
  name: string;
  kind: PolicyKind;
  pattern: string;
  description: string;
  priority: number;
  riskScore: number;
  riskLabel: RiskLabel;
};

export const DEFAULT_POLICIES: DefaultPolicyDefinition[] = [
  {
    name: 'block-rm-recursive-root',
    kind: PolicyKind.DENY,
    pattern: '\\brm\\s+(?:-[a-zA-Z]*r[a-zA-Z]*f?|-[a-zA-Z]*f[a-zA-Z]*r?)\\s+(/|\\*|~|\\$HOME)',
    description: 'Blocks rm -rf targeting root, wildcard, or home directory',
    priority: 1000,
    riskScore: 100,
    riskLabel: RiskLabel.CRITICAL,
  },
  {
    name: 'block-fork-bomb',
    kind: PolicyKind.DENY,
    pattern: ':\\(\\)\\s*\\{\\s*:\\|:&\\s*\\};\\s*:',
    description: 'Blocks the classic fork-bomb shell pattern',
    priority: 1000,
    riskScore: 100,
    riskLabel: RiskLabel.CRITICAL,
  },
  {
    name: 'block-dd-to-device',
    kind: PolicyKind.DENY,
    pattern: '\\bdd\\s+.*of=/dev/(sd[a-z]|nvme|hd[a-z]|disk)',
    description: 'Blocks dd writes to raw block devices',
    priority: 1000,
    riskScore: 100,
    riskLabel: RiskLabel.CRITICAL,
  },
  {
    name: 'block-curl-pipe-sh',
    kind: PolicyKind.DENY,
    pattern: '(curl|wget)\\s+[^|]+\\|\\s*(sh|bash|zsh|python)',
    description: 'Blocks piping remote scripts directly into a shell',
    priority: 900,
    riskScore: 95,
    riskLabel: RiskLabel.CRITICAL,
  },
  {
    name: 'block-shutdown-reboot',
    kind: PolicyKind.DENY,
    pattern: '\\b(shutdown|reboot|halt|poweroff)\\b(\\s+-|\\s*$)',
    description: 'Blocks shutdown/reboot commands',
    priority: 800,
    riskScore: 90,
    riskLabel: RiskLabel.CRITICAL,
  },
  {
    name: 'block-chmod-777',
    kind: PolicyKind.DENY,
    pattern: '\\bchmod\\s+(-R\\s+)?0?777\\b',
    description: 'Blocks world-writable permission grants',
    priority: 700,
    riskScore: 70,
    riskLabel: RiskLabel.HIGH,
  },
  {
    name: 'high-risk-force-push',
    kind: PolicyKind.ALLOW,
    pattern: '\\bgit\\s+push\\s+(?:--force|-f)\\b',
    description: 'Force-push flagged for review; still executable with user approval',
    priority: 500,
    riskScore: 75,
    riskLabel: RiskLabel.HIGH,
  },
  {
    name: 'high-risk-drop-table',
    kind: PolicyKind.ALLOW,
    pattern: '\\bDROP\\s+(TABLE|DATABASE|SCHEMA)\\b',
    description: 'SQL destructive DDL flagged for review',
    priority: 500,
    riskScore: 80,
    riskLabel: RiskLabel.HIGH,
  },
  {
    name: 'medium-risk-sudo',
    kind: PolicyKind.ALLOW,
    pattern: '\\bsudo\\s+\\S',
    description: 'Elevated-privilege command flagged for review',
    priority: 300,
    riskScore: 55,
    riskLabel: RiskLabel.MEDIUM,
  },
  {
    name: 'auto-approve-ls',
    kind: PolicyKind.AUTO_APPROVE,
    pattern: '^\\s*ls(\\s+-[a-zA-Z]+)?(\\s+\\S+)?\\s*$',
    description: 'Read-only directory listing',
    priority: 100,
    riskScore: 0,
    riskLabel: RiskLabel.LOW,
  },
  {
    name: 'auto-approve-pwd',
    kind: PolicyKind.AUTO_APPROVE,
    pattern: '^\\s*pwd\\s*$',
    description: 'Current directory probe',
    priority: 100,
    riskScore: 0,
    riskLabel: RiskLabel.LOW,
  },
  {
    name: 'auto-approve-git-status',
    kind: PolicyKind.AUTO_APPROVE,
    pattern: '^\\s*git\\s+(status|log|diff|branch|remote\\s+-v)\\s*$',
    description: 'Read-only Git introspection',
    priority: 100,
    riskScore: 0,
    riskLabel: RiskLabel.LOW,
  },
  {
    name: 'auto-approve-node-version',
    kind: PolicyKind.AUTO_APPROVE,
    pattern: '^\\s*(node|npm|pnpm|yarn|python|python3|pip)\\s+--version\\s*$',
    description: 'Version probes',
    priority: 100,
    riskScore: 0,
    riskLabel: RiskLabel.LOW,
  },
];

export const POLICY_EVALUATION_CACHE_TTL_SECONDS = 30;

export const RISK_LEVEL_ORDER: Record<RiskLabel, number> = {
  [RiskLabel.LOW]: 0,
  [RiskLabel.MEDIUM]: 1,
  [RiskLabel.HIGH]: 2,
  [RiskLabel.CRITICAL]: 3,
};

export const RISK_SCORE_CRITICAL_THRESHOLD = 85;
export const RISK_SCORE_HIGH_THRESHOLD = 60;
export const RISK_SCORE_MEDIUM_THRESHOLD = 30;

export const HEURISTIC_BASE_SCORE = 10;
export const HEURISTIC_SHELL_CHAIN_SCORE = 15;
export const HEURISTIC_PRIVILEGED_WRITE_SCORE = 20;
export const HEURISTIC_LONG_COMMAND_SCORE = 15;
export const HEURISTIC_NEGATIVE_FLAG_SCORE = 5;
export const HEURISTIC_LONG_COMMAND_THRESHOLD = 500;
export const HEURISTIC_MAX_SCORE = 100;
