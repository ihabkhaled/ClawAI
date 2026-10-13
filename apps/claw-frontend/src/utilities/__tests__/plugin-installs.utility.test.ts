import type { PluginInstallView, PluginSettingView } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import { PluginInstallGateReason } from '@/enums/plugin-install-gate-reason.enum';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { ApiClientError } from '@/services/shared/api-client';

import {
  catalogStatusKey,
  diffSettings,
  formatPluginLimit,
  hasConsent,
  isEnabled,
  isInstallCapReached,
  isUnavailable,
  needsApiKey,
  pluginErrorKey,
  resolveInstallGate,
  settingDraftValue,
  settingsToDraft,
  toConsentLevel,
  toRiskLevel,
  validateSettingValue,
} from '../plugin-installs.utility';

function install(overrides: Partial<PluginInstallView> = {}): PluginInstallView {
  return {
    id: 'i1',
    slug: 'weather',
    name: 'Weather',
    iconKey: 'cloud',
    version: '1.0.0',
    latestVersion: null,
    state: 'ENABLED',
    authKind: 'NONE',
    settings: {},
    credential: { hasCredential: false, kind: null, updatedAt: null },
    consents: [],
    installedAt: '2026-10-13T00:00:00Z',
    updatedAt: '2026-10-13T00:00:00Z',
    ...overrides,
  };
}

const OPEN_GATE = {
  alreadyInstalled: false,
  globallyDisabled: false,
  planAllows: true,
  cap: 5,
  installedCount: 0,
};

describe('isInstallCapReached', () => {
  it('treats null and undefined as no cap, and 0 as disabled', () => {
    expect(isInstallCapReached(null, 999)).toBe(false);
    expect(isInstallCapReached(undefined, 999)).toBe(false);
    expect(isInstallCapReached(0, 0)).toBe(true);
  });

  it('is reached at the cap and not below it', () => {
    expect(isInstallCapReached(5, 4)).toBe(false);
    expect(isInstallCapReached(5, 5)).toBe(true);
    expect(isInstallCapReached(5, 6)).toBe(true);
  });
});

describe('resolveInstallGate', () => {
  it('allows an install when nothing blocks it', () => {
    expect(resolveInstallGate(OPEN_GATE)).toEqual({
      reason: PluginInstallGateReason.None,
      canInstall: true,
    });
  });

  it('reports a global disable before anything else', () => {
    const gate = resolveInstallGate({
      ...OPEN_GATE,
      globallyDisabled: true,
      alreadyInstalled: true,
      planAllows: false,
    });
    expect(gate.reason).toBe(PluginInstallGateReason.GloballyDisabled);
    expect(gate.canInstall).toBe(false);
  });

  it('reports already installed, then the plan gate, then the cap', () => {
    expect(resolveInstallGate({ ...OPEN_GATE, alreadyInstalled: true }).reason).toBe(
      PluginInstallGateReason.AlreadyInstalled,
    );
    expect(resolveInstallGate({ ...OPEN_GATE, planAllows: false, cap: 0 }).reason).toBe(
      PluginInstallGateReason.PlanOff,
    );
    expect(resolveInstallGate({ ...OPEN_GATE, installedCount: 5 }).reason).toBe(
      PluginInstallGateReason.LimitReached,
    );
  });

  it('keeps null (unlimited) and 0 (disabled) apart', () => {
    expect(resolveInstallGate({ ...OPEN_GATE, cap: null, installedCount: 500 }).canInstall).toBe(
      true,
    );
    expect(resolveInstallGate({ ...OPEN_GATE, cap: 0 }).reason).toBe(
      PluginInstallGateReason.LimitReached,
    );
  });
});

describe('install state helpers', () => {
  it('reads the state', () => {
    expect(isEnabled(install())).toBe(true);
    expect(isEnabled(install({ state: 'DISABLED' }))).toBe(false);
    expect(isUnavailable(install({ state: 'UNAVAILABLE' }))).toBe(true);
    expect(isUnavailable(install())).toBe(false);
  });

  it('asks for a key only for an API-key plugin', () => {
    expect(needsApiKey(PluginAuthKind.ApiKey)).toBe(true);
    expect(needsApiKey(PluginAuthKind.None)).toBe(false);
    expect(needsApiKey(PluginAuthKind.OAuth2Pkce)).toBe(false);
  });

  it('finds a granted consent by tool name', () => {
    const view = install({
      consents: [{ toolName: 'send', level: 'WRITE', grantedAt: '2026-10-13T00:00:00Z' }],
    });
    expect(hasConsent(view, 'send')).toBe(true);
    expect(hasConsent(view, 'other')).toBe(false);
  });
});

describe('risk mapping', () => {
  it('maps a risk to a consent level, and READ to none', () => {
    expect(toConsentLevel(PluginRiskLevel.Write)).toBe('WRITE');
    expect(toConsentLevel(PluginRiskLevel.Destructive)).toBe('DESTRUCTIVE');
    expect(toConsentLevel(PluginRiskLevel.Read)).toBeNull();
  });

  it('maps the server string to the enum', () => {
    expect(toRiskLevel('READ')).toBe(PluginRiskLevel.Read);
    expect(toRiskLevel('WRITE')).toBe(PluginRiskLevel.Write);
    expect(toRiskLevel('DESTRUCTIVE')).toBe(PluginRiskLevel.Destructive);
  });
});

describe('pluginErrorKey', () => {
  it('maps a known code', () => {
    const error = new ApiClientError({ message: 'x', status: 403, code: 'PLUGIN_INSTALL_LIMIT' });
    expect(pluginErrorKey(error)).toBe('pluginsInstall.errors.limit');
    const unavailable = new ApiClientError({
      message: 'x',
      status: 403,
      code: 'PLUGIN_UNAVAILABLE',
    });
    expect(pluginErrorKey(unavailable)).toBe('pluginsInstall.errors.unavailable');
  });

  it('maps the plan and entitlements codes to their own messages', () => {
    const planOff = new ApiClientError({ message: 'x', status: 403, code: 'PLUGIN_PLAN_DISABLED' });
    expect(pluginErrorKey(planOff)).toBe('pluginsStatus.errors.planDisabled');
    const noEntitlements = new ApiClientError({
      message: 'x',
      status: 503,
      code: 'PLUGIN_ENTITLEMENTS_UNAVAILABLE',
    });
    expect(pluginErrorKey(noEntitlements)).toBe('pluginsStatus.errors.entitlementsUnavailable');
  });

  it('does not treat an inherited object property as a known code', () => {
    const inherited = new ApiClientError({ message: 'x', status: 500, code: 'toString' });
    expect(pluginErrorKey(inherited)).toBe('pluginsInstall.errors.generic');
    expect(catalogStatusKey('constructor')).toBe('constructor');
  });

  it('names every catalog status and passes an unknown one through', () => {
    expect(catalogStatusKey('PUBLISHED')).toBe('pluginsStatus.catalogStatus.PUBLISHED');
    expect(catalogStatusKey('DRAFT')).toBe('pluginsStatus.catalogStatus.DRAFT');
    expect(catalogStatusKey('DEPRECATED')).toBe('pluginsStatus.catalogStatus.DEPRECATED');
    expect(catalogStatusKey('HIDDEN')).toBe('pluginsStatus.catalogStatus.HIDDEN');
    expect(catalogStatusKey('NEW_STATE')).toBe('NEW_STATE');
  });

  it('falls back to the status for 409 and 404 when the code is unknown or absent', () => {
    expect(pluginErrorKey(new ApiClientError({ message: 'x', status: 409 }))).toBe(
      'pluginsInstall.errors.alreadyInstalled',
    );
    expect(
      pluginErrorKey(new ApiClientError({ message: 'x', status: 404, code: 'SOMETHING_ELSE' })),
    ).toBe('pluginsInstall.errors.notFound');
  });

  it('is generic for anything else, including a non-API error', () => {
    expect(pluginErrorKey(new ApiClientError({ message: 'x', status: 500 }))).toBe(
      'pluginsInstall.errors.generic',
    );
    expect(pluginErrorKey(new Error('boom'))).toBe('pluginsInstall.errors.generic');
    expect(pluginErrorKey(undefined)).toBe('pluginsInstall.errors.generic');
  });
});

describe('formatPluginLimit', () => {
  it('shows null as unlimited and 0 as disabled', () => {
    expect(formatPluginLimit(null, 'Unlimited', 'Disabled')).toBe('Unlimited');
    expect(formatPluginLimit(undefined, 'Unlimited', 'Disabled')).toBe('Unlimited');
    expect(formatPluginLimit(0, 'Unlimited', 'Disabled')).toBe('Disabled');
    expect(formatPluginLimit(5, 'Unlimited', 'Disabled')).toBe('5');
  });
});

describe('admin settings drafts', () => {
  const settings: PluginSettingView[] = [
    { key: 'userServers.enabled', value: true, updatedAt: null },
    { key: 'loop.maxRounds', value: 5, updatedAt: null },
    { key: 'unknown.limit', value: 10, updatedAt: null },
  ];

  it('turns settings into a draft of strings and booleans', () => {
    expect(settingDraftValue(settings[0] as PluginSettingView)).toBe(true);
    expect(settingDraftValue(settings[1] as PluginSettingView)).toBe('5');
    expect(settingsToDraft(settings)).toEqual({
      'userServers.enabled': true,
      'loop.maxRounds': '5',
      'unknown.limit': '10',
    });
  });

  it('validates a flag, a whole number and the key bounds', () => {
    const [flag, rounds, other] = settings as [
      PluginSettingView,
      PluginSettingView,
      PluginSettingView,
    ];
    expect(validateSettingValue(flag, false)).toBeUndefined();
    expect(validateSettingValue(flag, 'yes')).toBe('pluginsInstall.validation.option');
    expect(validateSettingValue(rounds, '7')).toBeUndefined();
    expect(validateSettingValue(rounds, '0')).toBe('pluginsInstall.validation.range');
    expect(validateSettingValue(rounds, '21')).toBe('pluginsInstall.validation.range');
    expect(validateSettingValue(rounds, '1.5')).toBe('pluginsInstall.validation.integer');
    expect(validateSettingValue(rounds, '')).toBe('pluginsInstall.validation.integer');
    expect(validateSettingValue(rounds, true)).toBe('pluginsInstall.validation.integer');
    expect(validateSettingValue(other, '1000')).toBeUndefined();
  });

  it('sends only what changed, as a boolean or a number', () => {
    const result = diffSettings(settings, {
      'userServers.enabled': false,
      'loop.maxRounds': '5',
      'unknown.limit': '12',
    });
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ 'userServers.enabled': false, 'unknown.limit': 12 });
  });

  it('sends nothing for an unchanged draft', () => {
    expect(diffSettings(settings, settingsToDraft(settings))).toEqual({ values: {}, errors: {} });
  });

  it('reports an error per invalid field and keeps valid changes out of the way', () => {
    const result = diffSettings(settings, {
      'userServers.enabled': true,
      'loop.maxRounds': '99',
    });
    expect(result.errors).toEqual({ 'loop.maxRounds': 'pluginsInstall.validation.range' });
    expect(result.values).toEqual({});
  });

  it('falls back to the saved value for a field missing from the draft', () => {
    expect(diffSettings(settings, {})).toEqual({ values: {}, errors: {} });
  });
});
