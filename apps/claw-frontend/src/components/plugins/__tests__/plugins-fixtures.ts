import type { PluginInstallView } from '@claw/shared-types';

import { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import { PluginInstallGateReason } from '@/enums/plugin-install-gate-reason.enum';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { PluginSource } from '@/enums/plugin-source.enum';
import type { UsePluginInstallPanelReturn } from '@/types/plugin-installs.types';
import type {
  PluginCatalogDetail,
  PluginCatalogItem,
  UsePluginsPageReturn,
} from '@/types/plugins.types';

/** Echoes the key (and params) so a test can assert which string was asked for. */
export function tStub(key: string, params?: Record<string, string | number>): string {
  return params === undefined ? key : `${key}|${Object.values(params).join(',')}`;
}

export function pluginItem(overrides: Partial<PluginCatalogItem> = {}): PluginCatalogItem {
  return {
    slug: 'web-fetch',
    name: 'Web fetch',
    summary: 'Read a public web page.',
    publisher: 'ClawAI',
    category: 'search',
    iconKey: 'globe',
    source: PluginSource.FirstParty,
    version: '1.0.0',
    toolCount: 1,
    maxRisk: PluginRiskLevel.Read,
    installCount: 0,
    installed: false,
    ...overrides,
  };
}

export function pluginDetail(overrides: Partial<PluginCatalogDetail> = {}): PluginCatalogDetail {
  return {
    ...pluginItem(),
    description: 'Fetch a public URL and return readable text.',
    auth: { kind: PluginAuthKind.None, scopes: [] },
    tools: [
      {
        name: 'fetch_page',
        title: 'Fetch a web page',
        description: 'Fetch a public URL.',
        riskLevel: PluginRiskLevel.Read,
      },
    ],
    network: { hosts: ['example.com'], publicWeb: false },
    ...overrides,
  };
}

export function pageState(overrides: Partial<UsePluginsPageReturn> = {}): UsePluginsPageReturn {
  return {
    t: tStub,
    filters: { q: '', category: '' },
    searchDraft: '',
    setSearchDraft: () => undefined,
    setCategory: () => undefined,
    clearFilters: () => undefined,
    items: [pluginItem()],
    isLoading: false,
    isError: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: () => undefined,
    retry: () => undefined,
    ...overrides,
  };
}

/** An install as the API returns it. Override only what a test is about. */
export function installView(overrides: Partial<PluginInstallView> = {}): PluginInstallView {
  return {
    id: 'i1',
    slug: 'web-fetch',
    name: 'Web fetch',
    iconKey: 'globe',
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

export function panelState(
  overrides: Partial<UsePluginInstallPanelReturn> = {},
): UsePluginInstallPanelReturn {
  return {
    t: tStub,
    install: undefined,
    gate: { reason: PluginInstallGateReason.None, canInstall: true },
    limit: 5,
    isOpen: false,
    openDialog: () => undefined,
    closeDialog: () => undefined,
    credential: '',
    setCredential: () => undefined,
    needsCredential: false,
    canConfirm: true,
    isInstalling: false,
    errorMessage: null,
    confirm: () => undefined,
    ...overrides,
  };
}
