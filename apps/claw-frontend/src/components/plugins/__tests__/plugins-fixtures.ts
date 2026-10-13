import { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { PluginSource } from '@/enums/plugin-source.enum';
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
