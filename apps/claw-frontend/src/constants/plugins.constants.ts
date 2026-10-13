import {
  Calculator,
  CloudSun,
  Code2,
  Database,
  Globe,
  Image as ImageIcon,
  Puzzle,
  Search,
  type LucideIcon,
} from 'lucide-react';

import { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { PluginSource } from '@/enums/plugin-source.enum';

/** Cards per request. The list is cursor-paged; "Load more" fetches the next page. */
export const PLUGINS_PAGE_SIZE = 24;

export const PLUGINS_SEARCH_PARAM = 'q';
export const PLUGINS_CATEGORY_PARAM = 'category';
export const PLUGINS_SEARCH_MAX_LENGTH = 80;

/** A category slug as the catalog stores it; anything else in the URL is ignored. */
export const PLUGIN_CATEGORY_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;

/** Categories the Discover chips offer. An unknown category from the server still renders, by its key. */
export const PLUGIN_CATEGORIES: readonly string[] = [
  'search',
  'productivity',
  'dev',
  'data',
  'media',
  'utilities',
];

/**
 * `iconKey` is a key into this map, never a URL, so a catalog row cannot make the
 * browser load a remote image. An unknown key falls back to the puzzle piece.
 */
export const PLUGIN_ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  web: Globe,
  calculator: Calculator,
  datetime: Calculator,
  weather: CloudSun,
  cloud: CloudSun,
  search: Search,
  code: Code2,
  database: Database,
  image: ImageIcon,
};

export const PLUGIN_FALLBACK_ICON: LucideIcon = Puzzle;

export const PLUGIN_RISK_ORDER: readonly PluginRiskLevel[] = [
  PluginRiskLevel.Read,
  PluginRiskLevel.Write,
  PluginRiskLevel.Destructive,
];

export const PLUGIN_RISK_BADGE_VARIANTS: Record<
  PluginRiskLevel,
  'success' | 'warning' | 'destructive'
> = {
  [PluginRiskLevel.Read]: 'success',
  [PluginRiskLevel.Write]: 'warning',
  [PluginRiskLevel.Destructive]: 'destructive',
};

export const PLUGIN_RISK_LABEL_KEYS: Record<PluginRiskLevel, string> = {
  [PluginRiskLevel.Read]: 'plugins.risk.read',
  [PluginRiskLevel.Write]: 'plugins.risk.write',
  [PluginRiskLevel.Destructive]: 'plugins.risk.destructive',
};

export const PLUGIN_RISK_HINT_KEYS: Record<PluginRiskLevel, string> = {
  [PluginRiskLevel.Read]: 'plugins.risk.readHint',
  [PluginRiskLevel.Write]: 'plugins.risk.writeHint',
  [PluginRiskLevel.Destructive]: 'plugins.risk.destructiveHint',
};

export const PLUGIN_AUTH_LABEL_KEYS: Record<PluginAuthKind, string> = {
  [PluginAuthKind.None]: 'plugins.auth.none',
  [PluginAuthKind.ApiKey]: 'plugins.auth.apiKey',
  [PluginAuthKind.BearerToken]: 'plugins.auth.bearerToken',
  [PluginAuthKind.OAuth2Pkce]: 'plugins.auth.oauth',
};

export const PLUGIN_SOURCE_LABEL_KEYS: Record<PluginSource, string> = {
  [PluginSource.FirstParty]: 'plugins.source.firstParty',
  [PluginSource.CuratedMcp]: 'plugins.source.curatedMcp',
};

const PLUGINS_SKELETON_COUNT = 6;
export const PLUGINS_SKELETON_KEYS: readonly string[] = Array.from(
  { length: PLUGINS_SKELETON_COUNT },
  (_, index) => `plugin-skeleton-${index}`,
);

/** A failed detail request is retried this many times, except a 404. */
export const PLUGIN_DETAIL_MAX_RETRIES = 2;

export const PLUGINS_GRID_CLASSES = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';

export const PLUGIN_CHIP_CLASSES = 'shrink-0 rounded-full';
