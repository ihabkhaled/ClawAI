import type {
  PluginInstallView,
  PluginSettingValue,
  PluginSettingView,
  PluginToolRiskLevel,
} from '@claw/shared-types';

import { HTTP_STATUS_CONFLICT, HTTP_STATUS_NOT_FOUND } from '@/constants/http-status.constants';
import {
  PLUGIN_CATALOG_STATUS_KEYS,
  PLUGIN_ERROR_KEY_CONFLICT,
  PLUGIN_ERROR_KEY_GENERIC,
  PLUGIN_ERROR_KEY_NOT_FOUND,
  PLUGIN_ERROR_KEYS,
  PLUGIN_INSTALL_STATE,
  PLUGIN_SETTING_BOUNDS,
  PLUGIN_SETTING_DEFAULT_BOUNDS,
  PLUGIN_VALIDATION_KEYS,
} from '@/constants/plugin-installs.constants';
import { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import { PluginInstallGateReason } from '@/enums/plugin-install-gate-reason.enum';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  PluginConsentLevel,
  PluginInstallGate,
  PluginInstallGateInput,
  PluginSettingsDraft,
} from '@/types/plugin-installs.types';

/** True once the plan's install cap is used up. `null` is unlimited and `0` is disabled. */
export function isInstallCapReached(cap: number | null | undefined, installed: number): boolean {
  if (cap === null || cap === undefined) {
    return false;
  }
  return installed >= cap;
}

/** Why Install is off, in the order a person should hear it. The server enforces all of it again. */
export function resolveInstallGate(input: PluginInstallGateInput): PluginInstallGate {
  let reason = PluginInstallGateReason.None;
  if (input.globallyDisabled) {
    reason = PluginInstallGateReason.GloballyDisabled;
  } else if (input.alreadyInstalled) {
    reason = PluginInstallGateReason.AlreadyInstalled;
  } else if (!input.planAllows) {
    reason = PluginInstallGateReason.PlanOff;
  } else if (isInstallCapReached(input.cap, input.installedCount)) {
    reason = PluginInstallGateReason.LimitReached;
  }
  return { reason, canInstall: reason === PluginInstallGateReason.None };
}

/** Does installing need a key from the user? Only an API-key plugin does. */
export function needsApiKey(kind: PluginAuthKind): boolean {
  return kind === PluginAuthKind.ApiKey;
}

/** The consent level for a tool, or null when its risk needs none. */
export function toConsentLevel(risk: PluginRiskLevel): PluginConsentLevel | null {
  switch (risk) {
    case PluginRiskLevel.Write:
      return 'WRITE';
    case PluginRiskLevel.Destructive:
      return 'DESTRUCTIVE';
    default:
      return null;
  }
}

/** Has the user granted this tool? */
export function hasConsent(install: PluginInstallView, toolName: string): boolean {
  return install.consents.some((consent) => consent.toolName === toolName);
}

export function isUnavailable(install: PluginInstallView): boolean {
  return install.state === PLUGIN_INSTALL_STATE.Unavailable;
}

export function isEnabled(install: PluginInstallView): boolean {
  return install.state === PLUGIN_INSTALL_STATE.Enabled;
}

/** The translation key a server error code maps to, or undefined for a code this UI has no text for. */
function errorKeyOfCode(error: unknown): string | undefined {
  if (!(error instanceof ApiClientError) || error.code === undefined) {
    return undefined;
  }
  return Object.hasOwn(PLUGIN_ERROR_KEYS, error.code) ? PLUGIN_ERROR_KEYS[error.code] : undefined;
}

/** The translation key for a failed plugin call: by code first, then by status, else generic. */
export function pluginErrorKey(error: unknown): string {
  const codeKey = errorKeyOfCode(error);
  if (codeKey !== undefined) {
    return codeKey;
  }
  if (error instanceof ApiClientError) {
    if (error.status === HTTP_STATUS_CONFLICT) {
      return PLUGIN_ERROR_KEY_CONFLICT;
    }
    if (error.status === HTTP_STATUS_NOT_FOUND) {
      return PLUGIN_ERROR_KEY_NOT_FOUND;
    }
  }
  return PLUGIN_ERROR_KEY_GENERIC;
}

/** The label key for a catalog status; an unknown status is shown as the server sent it. */
export function catalogStatusKey(status: string): string {
  return Object.hasOwn(PLUGIN_CATALOG_STATUS_KEYS, status)
    ? (PLUGIN_CATALOG_STATUS_KEYS[status] ?? status)
    : status;
}

/** A setting's value as the draft holds it. */
export function settingDraftValue(setting: PluginSettingView): string | boolean {
  return typeof setting.value === 'boolean' ? setting.value : String(setting.value);
}

export function settingsToDraft(settings: PluginSettingView[]): PluginSettingsDraft {
  return Object.fromEntries(settings.map((setting) => [setting.key, settingDraftValue(setting)]));
}

/** The error key for one admin setting draft, or undefined when it is valid. */
export function validateSettingValue(
  setting: PluginSettingView,
  value: string | boolean,
): string | undefined {
  if (typeof setting.value === 'boolean') {
    return typeof value === 'boolean' ? undefined : PLUGIN_VALIDATION_KEYS.option;
  }
  const bounds = PLUGIN_SETTING_BOUNDS[setting.key] ?? PLUGIN_SETTING_DEFAULT_BOUNDS;
  const text = typeof value === 'string' ? value.trim() : '';
  const parsed = Number(text);
  if (text.length === 0 || !Number.isInteger(parsed)) {
    return PLUGIN_VALIDATION_KEYS.integer;
  }
  return parsed < bounds.min || parsed > bounds.max ? PLUGIN_VALIDATION_KEYS.range : undefined;
}

/** Only settings whose draft differs from the saved value are sent. Errors block the whole save. */
export function diffSettings(
  settings: PluginSettingView[],
  draft: PluginSettingsDraft,
): { values: Record<string, PluginSettingValue>; errors: Record<string, string> } {
  const values: Record<string, PluginSettingValue> = {};
  const errors: Record<string, string> = {};
  for (const setting of settings) {
    const next = draft[setting.key] ?? settingDraftValue(setting);
    const error = validateSettingValue(setting, next);
    if (error !== undefined) {
      errors[setting.key] = error;
    } else if (next !== settingDraftValue(setting)) {
      values[setting.key] = typeof next === 'boolean' ? next : Number(next);
    }
  }
  return { values, errors };
}

/** The server's risk string as the frontend enum, so the badge and its label maps stay typed. */
export function toRiskLevel(level: PluginToolRiskLevel): PluginRiskLevel {
  switch (level) {
    case 'WRITE':
      return PluginRiskLevel.Write;
    case 'DESTRUCTIVE':
      return PluginRiskLevel.Destructive;
    default:
      return PluginRiskLevel.Read;
  }
}

/** A plan cap for display: null is unlimited and 0 is disabled, and they must never read alike. */
export function formatPluginLimit(
  value: number | null | undefined,
  unlimitedLabel: string,
  disabledLabel: string,
): string {
  if (value === null || value === undefined) {
    return unlimitedLabel;
  }
  return value === 0 ? disabledLabel : value.toLocaleString();
}
