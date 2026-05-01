import { CapabilityClass } from '../enums/capability-class.enum';
import { CapabilityOperation } from '../enums/capability-operation.enum';
import { PolicyKind } from '../enums/policy-kind.enum';
import { RiskLabel } from '../enums/risk-label.enum';

/**
 * Capability framework default AccessPolicy seeds (Streams 10/11/12).
 *
 * Idempotent upsert by `name` at startup. `isSystemDefault=true` means
 * the row is DELETE-protected (admin can deactivate via UI but not
 * remove). Streams 13/20-24 append to this constant as they ship.
 *
 * Matcher contract — `targetMatcherJson` shape per class:
 *   FILESYSTEM:    { pathGlob?: string[]; pathDenyGlob?: string[]; requireExistingFile?: boolean; maxBytes?: number }
 *   PROCESS:       { binaryNameRegex?: string; binaryPathDenyGlob?: string[]; pidRange?: [number, number]; uidMatchesCurrentUser?: boolean }
 *   BROWSER:       { urlGlob?: string[]; urlDenyGlob?: string[]; urlPathRegex?: string }
 *   SCREEN:        { activeAppDenyRegex?: string[]; payloadHasRegion?: boolean }
 *   CLIPBOARD:     { payloadFlag?: string }
 *   APPLICATION:   { binaryNameRegex?: string; windowTitleRegex?: string }
 *   AUDIO:         { sourcePathGlob?: string[]; routesToCloud?: boolean }
 *   GENERIC:       { contentRegex?: string; recipientDomainRegex?: string }
 */
export type CapabilityDefaultPolicy = {
  name: string;
  description: string;
  kind: PolicyKind;
  riskLabel: RiskLabel;
  riskScore: number;
  priority: number;
  pattern: string; // legacy regex column — kept for cross-compat with terminal flow; '' for new-class policies
  scope: string | null;
  capabilityClass: CapabilityClass | null;
  capabilityOperation: CapabilityOperation | null;
  targetMatcherJson: Record<string, unknown> | null;
  autoApproveMaxRiskScore: number | null;
  requireReason: boolean;
};

/**
 * Default deny-globs for filesystem policies. Mirrored / overridable via
 * FS_DEFAULT_DENY_GLOBS env var at runtime.
 */
export const DEFAULT_FS_DENY_GLOBS = [
  '**/.ssh/**',
  '**/.aws/**',
  '**/.kube/**',
  '**/credentials*',
  '**/.env*',
  '/etc/**',
  '/sys/**',
  '/proc/**',
  '/boot/**',
  'C:/Windows/**',
  'C:/Program Files/**',
  'C:/Program Files (x86)/**',
];

export const DEFAULT_FS_ALLOW_GLOBS_USER_DOCS = [
  '**/Documents/**',
  '**/Downloads/**',
  '**/Desktop/**',
  '**/Pictures/**',
  '**/Videos/**',
  '**/Music/**',
];

/**
 * System processes that should never be killed by the agent.
 */
export const DEFAULT_PROCESS_DENY_BINARY_REGEX =
  '^(init|systemd|launchd|services\\.exe|wininit\\.exe|csrss\\.exe|smss\\.exe|kernel.*|kthreadd|sshd|gpg-agent|ssh-agent)$';

/**
 * Common dev-tool binaries permitted to spawn under MEDIUM-risk
 * `allow-process-spawn-known-binaries`.
 */
export const DEFAULT_PROCESS_KNOWN_BINARY_REGEX =
  '^(node|python|python3|docker|docker-compose|npm|pnpm|yarn|git|make|go|cargo|rustc|deno|bun|tsc|vite|next|jest|vitest)$';

/**
 * Browser deny-globs default — banking, credentials, common SSO pages.
 * Overridable via BROWSER_DEFAULT_DOMAIN_DENY env var.
 */
export const DEFAULT_BROWSER_DENY_URL_GLOBS = [
  '**/*.bank/**',
  '**/*.banking/**',
  '**/*.health/**',
  '**/*.gov/**',
  '**/login.microsoftonline.com/**',
  '**/accounts.google.com/**',
  '**/login.live.com/**',
  '**/auth0.com/**',
];

/**
 * Screen capture deny — apps known to display secrets.
 */
export const DEFAULT_SCREEN_APP_DENY_REGEX =
  '(1Password|Bitwarden|LastPass|KeePass|Dashlane|Bank.*|Tax.*|Banking.*)';

/**
 * The seed list itself. Total: 13 (terminal — already exist in
 * policy.constants.ts) + 10 (filesystem) + 8 (process) + 10 (browser) +
 * 6 (screen) + 6 (clipboard) + 3 (notification) + 8 (application) +
 * 6 (audio) + 1 catch-all generic.
 *
 * Streams ship them progressively — the AppConfig seed manager filters
 * by `capabilityClass` enum value at startup so unimplemented classes
 * are skipped (their providers haven't been registered yet).
 */
export const DEFAULT_CAPABILITY_POLICIES: CapabilityDefaultPolicy[] = [
  // ====================== FILESYSTEM (Stream 11) ======================
  {
    name: 'deny-fs-system-paths',
    description: 'Deny any FS op against system paths (/etc, /sys, /proc, Windows system dirs)',
    kind: PolicyKind.DENY,
    riskLabel: RiskLabel.CRITICAL,
    riskScore: 100,
    priority: 950,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: null,
    targetMatcherJson: { pathDenyGlob: DEFAULT_FS_DENY_GLOBS },
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
  {
    name: 'deny-fs-credentials',
    description: 'Deny any FS op against credential / SSH key / cloud auth files',
    kind: PolicyKind.DENY,
    riskLabel: RiskLabel.CRITICAL,
    riskScore: 95,
    priority: 940,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: null,
    targetMatcherJson: {
      pathDenyGlob: ['**/.ssh/**', '**/.aws/**', '**/.kube/**', '**/credentials*', '**/.env*', '**/id_rsa*', '**/id_ed25519*'],
    },
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
  {
    name: 'deny-fs-dotfiles-write',
    description: 'Deny WRITE/APPEND/DELETE against dotfiles to avoid clobbering config',
    kind: PolicyKind.DENY,
    riskLabel: RiskLabel.HIGH,
    riskScore: 75,
    priority: 920,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: null,
    targetMatcherJson: { pathDenyGlob: ['**/.[!.]*'] },
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
  {
    name: 'allow-fs-read-user-dirs',
    description: 'Allow READ in user-document directories — pending approval at MEDIUM risk',
    kind: PolicyKind.ALLOW,
    riskLabel: RiskLabel.MEDIUM,
    riskScore: 35,
    priority: 500,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: CapabilityOperation.READ,
    targetMatcherJson: { pathGlob: DEFAULT_FS_ALLOW_GLOBS_USER_DOCS },
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
  {
    name: 'allow-fs-write-user-dirs',
    description: 'Allow WRITE/APPEND/MOVE in user-document directories at MEDIUM risk',
    kind: PolicyKind.ALLOW,
    riskLabel: RiskLabel.MEDIUM,
    riskScore: 40,
    priority: 480,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: null,
    targetMatcherJson: { pathGlob: DEFAULT_FS_ALLOW_GLOBS_USER_DOCS },
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
  {
    name: 'auto-approve-fs-read-user-docs-low-risk',
    description: 'Auto-approve READ in user docs when risk score is LOW',
    kind: PolicyKind.AUTO_APPROVE,
    riskLabel: RiskLabel.LOW,
    riskScore: 10,
    priority: 100,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: CapabilityOperation.READ,
    targetMatcherJson: { pathGlob: DEFAULT_FS_ALLOW_GLOBS_USER_DOCS },
    autoApproveMaxRiskScore: 20,
    requireReason: false,
  },
  {
    name: 'auto-approve-fs-list',
    description: 'Auto-approve LIST in user dirs',
    kind: PolicyKind.AUTO_APPROVE,
    riskLabel: RiskLabel.LOW,
    riskScore: 5,
    priority: 95,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: CapabilityOperation.LIST,
    targetMatcherJson: { pathGlob: DEFAULT_FS_ALLOW_GLOBS_USER_DOCS },
    autoApproveMaxRiskScore: 15,
    requireReason: false,
  },
  {
    name: 'auto-approve-fs-stat',
    description: 'Auto-approve STAT in user dirs',
    kind: PolicyKind.AUTO_APPROVE,
    riskLabel: RiskLabel.LOW,
    riskScore: 5,
    priority: 90,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: CapabilityOperation.STAT,
    targetMatcherJson: { pathGlob: DEFAULT_FS_ALLOW_GLOBS_USER_DOCS },
    autoApproveMaxRiskScore: 15,
    requireReason: false,
  },
  {
    name: 'always-pending-fs-permanent-delete',
    description: 'Permanent delete is irreversible — always require explicit human approval',
    kind: PolicyKind.ALLOW,
    riskLabel: RiskLabel.HIGH,
    riskScore: 70,
    priority: 800,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: CapabilityOperation.DELETE,
    targetMatcherJson: { payloadFlag: 'permanent' },
    autoApproveMaxRiskScore: null,
    requireReason: true,
  },
  {
    name: 'catch-all-fs-pending',
    description: 'Catch-all — anything else FS-class lands as PENDING_APPROVAL',
    kind: PolicyKind.ALLOW,
    riskLabel: RiskLabel.MEDIUM,
    riskScore: 30,
    priority: 1,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.FILESYSTEM,
    capabilityOperation: null,
    targetMatcherJson: null,
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },

  // ====================== PROCESS (Stream 12) ======================
  {
    name: 'deny-process-kill-pid-1',
    description: 'Never kill PID 1 — would brick the user',
    kind: PolicyKind.DENY,
    riskLabel: RiskLabel.CRITICAL,
    riskScore: 100,
    priority: 990,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.PROCESS,
    capabilityOperation: CapabilityOperation.KILL,
    targetMatcherJson: { pidRange: [1, 99] },
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
  {
    name: 'deny-process-kill-system-services',
    description: 'Never kill system services / kernel threads / agents',
    kind: PolicyKind.DENY,
    riskLabel: RiskLabel.CRITICAL,
    riskScore: 95,
    priority: 980,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.PROCESS,
    capabilityOperation: CapabilityOperation.KILL,
    targetMatcherJson: { binaryNameRegex: DEFAULT_PROCESS_DENY_BINARY_REGEX },
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
  {
    name: 'deny-process-kill-other-uid',
    description: 'Never kill processes owned by another UID',
    kind: PolicyKind.DENY,
    riskLabel: RiskLabel.HIGH,
    riskScore: 85,
    priority: 950,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.PROCESS,
    capabilityOperation: CapabilityOperation.KILL,
    targetMatcherJson: { uidMatchesCurrentUser: true },
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
  {
    name: 'allow-process-list',
    description: 'Auto-approve LIST_RUNNING — read-only',
    kind: PolicyKind.AUTO_APPROVE,
    riskLabel: RiskLabel.LOW,
    riskScore: 5,
    priority: 100,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.PROCESS,
    capabilityOperation: CapabilityOperation.LIST_RUNNING,
    targetMatcherJson: null,
    autoApproveMaxRiskScore: 15,
    requireReason: false,
  },
  {
    name: 'allow-process-spawn-known-binaries',
    description: 'Allow SPAWN of known dev-tool binaries at MEDIUM risk',
    kind: PolicyKind.ALLOW,
    riskLabel: RiskLabel.MEDIUM,
    riskScore: 35,
    priority: 480,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.PROCESS,
    capabilityOperation: CapabilityOperation.SPAWN,
    targetMatcherJson: { binaryNameRegex: DEFAULT_PROCESS_KNOWN_BINARY_REGEX },
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
  {
    name: 'allow-process-kill-managed',
    description: 'Allow KILL of agent-spawned PIDs (we know the lineage)',
    kind: PolicyKind.ALLOW,
    riskLabel: RiskLabel.MEDIUM,
    riskScore: 30,
    priority: 470,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.PROCESS,
    capabilityOperation: CapabilityOperation.KILL,
    targetMatcherJson: { managedByAgent: true },
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
  {
    name: 'auto-approve-process-tail-managed',
    description: 'Auto-approve TAIL_OUTPUT on agent-spawned PIDs',
    kind: PolicyKind.AUTO_APPROVE,
    riskLabel: RiskLabel.LOW,
    riskScore: 5,
    priority: 90,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.PROCESS,
    capabilityOperation: CapabilityOperation.TAIL_OUTPUT,
    targetMatcherJson: { managedByAgent: true },
    autoApproveMaxRiskScore: 15,
    requireReason: false,
  },
  {
    name: 'catch-all-process-pending',
    description: 'Catch-all process operation — pending approval',
    kind: PolicyKind.ALLOW,
    riskLabel: RiskLabel.MEDIUM,
    riskScore: 40,
    priority: 1,
    pattern: '',
    scope: null,
    capabilityClass: CapabilityClass.PROCESS,
    capabilityOperation: null,
    targetMatcherJson: null,
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },

  // ====================== GENERIC catch-all ======================
  // Any capability class for which no class-specific policy matched at all.
  // Lowest priority — only fires if no class match. Always pending.
  {
    name: 'catch-all-capability-pending',
    description: 'Catch-all — anything not matched by class-specific policies lands PENDING_APPROVAL',
    kind: PolicyKind.ALLOW,
    riskLabel: RiskLabel.MEDIUM,
    riskScore: 40,
    priority: 0,
    pattern: '',
    scope: null,
    capabilityClass: null,
    capabilityOperation: null,
    targetMatcherJson: null,
    autoApproveMaxRiskScore: null,
    requireReason: false,
  },
];
