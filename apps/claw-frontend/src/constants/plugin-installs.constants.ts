import type { PluginInstallState } from '@claw/shared-types';

import { PluginInstallGateReason } from '@/enums/plugin-install-gate-reason.enum';

/** The install states the server sends, named once so no component compares a bare string. */
export const PLUGIN_INSTALL_STATE: Record<
  'Enabled' | 'Disabled' | 'Unavailable',
  PluginInstallState
> = {
  Enabled: 'ENABLED',
  Disabled: 'DISABLED',
  Unavailable: 'UNAVAILABLE',
};

/** An API key is never longer than this; the input stops the paste instead of the server. */
export const PLUGIN_CREDENTIAL_MAX_LENGTH = 4096;

/** Skeleton cards on the Installed page while the list loads. */
export const PLUGIN_INSTALLED_SKELETON_COUNT = 3;
export const PLUGIN_INSTALLED_SKELETON_KEYS: readonly string[] = Array.from(
  { length: PLUGIN_INSTALLED_SKELETON_COUNT },
  (_, index) => `plugin-installed-skeleton-${index}`,
);

/** Translation keys per server error code; anything else falls back to the generic message. */
export const PLUGIN_ERROR_KEYS: Readonly<Record<string, string>> = {
  PLUGIN_PLAN_DISABLED: 'pluginsStatus.errors.planDisabled',
  PLUGIN_ENTITLEMENTS_UNAVAILABLE: 'pluginsStatus.errors.entitlementsUnavailable',
  PLUGIN_INSTALL_LIMIT: 'pluginsInstall.errors.limit',
  PLUGIN_ALREADY_INSTALLED: 'pluginsInstall.errors.alreadyInstalled',
  PLUGIN_NOT_FOUND: 'pluginsInstall.errors.notFound',
  PLUGIN_INSTALL_NOT_FOUND: 'pluginsInstall.errors.notFound',
  PLUGIN_UNAVAILABLE: 'pluginsInstall.errors.unavailable',
  PLUGIN_SETTINGS_INVALID: 'pluginsInstall.errors.settingsInvalid',
  PLUGIN_SETTING_INVALID: 'pluginsInstall.errors.settingsInvalid',
  PLUGIN_CREDENTIAL_NOT_SUPPORTED: 'pluginsInstall.errors.credentialUnsupported',
  PLUGIN_CREDENTIAL_HEADER_DENIED: 'pluginsInstall.errors.headerDenied',
};

export const PLUGIN_ERROR_KEY_CONFLICT = 'pluginsInstall.errors.alreadyInstalled';
export const PLUGIN_ERROR_KEY_NOT_FOUND = 'pluginsInstall.errors.notFound';
export const PLUGIN_ERROR_KEY_GENERIC = 'pluginsInstall.errors.generic';

/** The install exists but storing the key failed: the dialog retries only the key call. */
export const PLUGIN_ERROR_KEY_CREDENTIAL_FAILED = 'pluginsStatus.errors.credentialFailed';

/** The label key per catalog status an admin sees on a row. */
export const PLUGIN_CATALOG_STATUS_KEYS: Readonly<Record<string, string>> = {
  DRAFT: 'pluginsStatus.catalogStatus.DRAFT',
  PUBLISHED: 'pluginsStatus.catalogStatus.PUBLISHED',
  DEPRECATED: 'pluginsStatus.catalogStatus.DEPRECATED',
  HIDDEN: 'pluginsStatus.catalogStatus.HIDDEN',
};

/** Admin settings: the label key for each setting key the plugin service seeds. */
export const PLUGIN_SETTING_LABEL_KEYS: Record<string, string> = {
  'userServers.enabled': 'pluginsInstall.admin.setting.userServersEnabled',
  'userServers.requireApproval': 'pluginsInstall.admin.setting.userServersRequireApproval',
  'userServers.allowHttp': 'pluginsInstall.admin.setting.userServersAllowHttp',
  'loop.maxRounds': 'pluginsInstall.admin.setting.loopMaxRounds',
  'loop.maxCallsPerTurn': 'pluginsInstall.admin.setting.loopMaxCallsPerTurn',
  'call.timeoutMs': 'pluginsInstall.admin.setting.callTimeoutMs',
  'call.maxResultBytes': 'pluginsInstall.admin.setting.callMaxResultBytes',
  'invocations.retentionDays': 'pluginsInstall.admin.setting.invocationsRetentionDays',
  'rate.perUserPerMinute': 'pluginsInstall.admin.setting.ratePerUserPerMinute',
  'rate.perUserConcurrent': 'pluginsInstall.admin.setting.ratePerUserConcurrent',
};

/** A numeric setting is a whole number in this range unless a key has its own bounds. */
export const PLUGIN_SETTING_DEFAULT_BOUNDS = { min: 1, max: 100_000_000 } as const;

/**
 * Integer bounds per admin setting. They equal the plugin service's PLUGIN_SETTING_RULES; a
 * test reads that file and pins every range, so the two cannot drift apart.
 */
export const PLUGIN_SETTING_BOUNDS: Record<string, { min: number; max: number }> = {
  'loop.maxRounds': { min: 1, max: 10 },
  'loop.maxCallsPerTurn': { min: 1, max: 20 },
  'call.timeoutMs': { min: 1_000, max: 60_000 },
  'call.maxResultBytes': { min: 1_024, max: 262_144 },
  'invocations.retentionDays': { min: 1, max: 365 },
  'rate.perUserPerMinute': { min: 1, max: 600 },
  'rate.perUserConcurrent': { min: 1, max: 20 },
};

/** The text/number limits a generated settings form applies to a free-text field. */
export const PLUGIN_SETTINGS_TEXT_MAX_LENGTH = 500;

/** Validation message keys for a generated settings form and the admin settings. */
export const PLUGIN_VALIDATION_KEYS = {
  required: 'pluginsInstall.validation.required',
  number: 'pluginsInstall.validation.number',
  integer: 'pluginsInstall.validation.integer',
  range: 'pluginsInstall.validation.range',
  option: 'pluginsInstall.validation.option',
  tooLong: 'pluginsInstall.validation.tooLong',
  tooShort: 'pluginsStatus.validation.tooShort',
} as const;

/** The sentence under a disabled Install button. Only an installable plugin needs none. */
export const PLUGIN_GATE_REASON_KEYS: Record<PluginInstallGateReason, string | null> = {
  [PluginInstallGateReason.None]: null,
  [PluginInstallGateReason.AlreadyInstalled]: 'pluginsStatus.install.alreadyInstalled',
  [PluginInstallGateReason.GloballyDisabled]: 'pluginsInstall.install.globallyDisabled',
  [PluginInstallGateReason.PlanOff]: 'pluginsInstall.install.planOff',
  [PluginInstallGateReason.LimitReached]: 'pluginsInstall.install.limitReached',
};

/** The badge label per install state. */
export const PLUGIN_STATE_LABEL_KEYS: Record<PluginInstallState, string> = {
  ENABLED: 'pluginsInstall.state.enabled',
  DISABLED: 'pluginsInstall.state.disabled',
  UNAVAILABLE: 'pluginsInstall.state.unavailable',
};

/** Gate reasons a bigger plan would fix, so the disabled Install button offers an upgrade link. */
export const PLUGIN_GATE_REASONS_WITH_UPGRADE: readonly PluginInstallGateReason[] = [
  PluginInstallGateReason.PlanOff,
  PluginInstallGateReason.LimitReached,
];

/** The Installed list: one column on a phone, two from lg. */
export const PLUGINS_INSTALLED_GRID_CLASSES = 'grid grid-cols-1 gap-4 lg:grid-cols-2';

export const PLUGINS_NAV_LINK_CLASSES =
  'focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none';
