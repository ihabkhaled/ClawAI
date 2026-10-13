import type { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import type { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import type { PluginSource } from '@/enums/plugin-source.enum';

/** A translator as passed to render-only components. */
export type PluginsTranslate = (key: string, params?: Record<string, string | number>) => string;

/** One card in the Discover list (GET /plugins/catalog), already localized by the server. */
export type PluginCatalogItem = {
  slug: string;
  name: string;
  summary: string;
  publisher: string;
  category: string;
  iconKey: string;
  source: PluginSource;
  version: string;
  toolCount: number;
  maxRisk: PluginRiskLevel;
  installCount: number;
  installed: boolean;
};

export type PluginCatalogPage = {
  items: PluginCatalogItem[];
  nextCursor: string | null;
};

/** A scope is shown by its id; the description is optional context. */
export type PluginScope = {
  id: string;
  description?: string;
};

export type PluginToolSummary = {
  name: string;
  title: string;
  description: string;
  riskLevel: PluginRiskLevel;
};

export type PluginCatalogDetail = PluginCatalogItem & {
  description: string;
  auth: { kind: PluginAuthKind; scopes: Array<PluginScope | string> };
  tools: PluginToolSummary[];
  network: { hosts: string[]; publicWeb: boolean };
};

export type ListPluginCatalogParams = {
  locale?: string;
  q?: string;
  category?: string;
  cursor?: string;
  limit?: number;
};

/** The Discover filters. Both live in the URL. */
export type PluginCatalogFilters = {
  q: string;
  category: string;
};

export type UsePluginsPageReturn = {
  t: PluginsTranslate;
  filters: PluginCatalogFilters;
  searchDraft: string;
  setSearchDraft: (value: string) => void;
  setCategory: (category: string) => void;
  clearFilters: () => void;
  items: PluginCatalogItem[];
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  retry: () => void;
};

export type UsePluginDetailReturn = {
  t: PluginsTranslate;
  plugin: PluginCatalogDetail | undefined;
  isLoading: boolean;
  isNotFound: boolean;
  isError: boolean;
  retry: () => void;
};

export type PluginIconProps = { iconKey: string; className?: string };

export type PluginRiskBadgeProps = { risk: PluginRiskLevel; t: PluginsTranslate };

export type PluginCardProps = { plugin: PluginCatalogItem; t: PluginsTranslate };

export type PluginCategoryChipsProps = {
  value: string;
  onChange: (category: string) => void;
  t: PluginsTranslate;
};

export type PluginToolListProps = { tools: PluginToolSummary[]; t: PluginsTranslate };

export type PluginPermissionsProps = { plugin: PluginCatalogDetail; t: PluginsTranslate };

export type PluginDetailPageProps = { slug: string };
