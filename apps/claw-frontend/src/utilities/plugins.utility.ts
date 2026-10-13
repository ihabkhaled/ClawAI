import {
  PLUGIN_CATEGORIES,
  PLUGIN_CATEGORY_PATTERN,
  PLUGINS_CATEGORY_PARAM,
  PLUGINS_SEARCH_MAX_LENGTH,
  PLUGINS_SEARCH_PARAM,
} from '@/constants/plugins.constants';
import type { PluginCatalogFilters, PluginScope, PluginsTranslate } from '@/types/plugins.types';

/** Reads the Discover filters from the URL. The search text is trimmed and capped. */
export function parsePluginFilters(params: URLSearchParams): PluginCatalogFilters {
  const category = (params.get(PLUGINS_CATEGORY_PARAM) ?? '').trim();
  return {
    q: (params.get(PLUGINS_SEARCH_PARAM) ?? '').trim().slice(0, PLUGINS_SEARCH_MAX_LENGTH),
    category: PLUGIN_CATEGORY_PATTERN.test(category) ? category : '',
  };
}

/** Writes the filters back; an empty filter removes its key so the URL stays clean. */
export function withPluginFilters(
  params: URLSearchParams,
  updates: Partial<PluginCatalogFilters>,
): string {
  const next = new URLSearchParams(params.toString());
  const keys: Array<[keyof PluginCatalogFilters, string]> = [
    ['q', PLUGINS_SEARCH_PARAM],
    ['category', PLUGINS_CATEGORY_PARAM],
  ];
  for (const [field, param] of keys) {
    const value = updates[field];
    if (value === undefined) {
      continue;
    }
    if (value.length === 0) {
      next.delete(param);
    } else {
      next.set(param, value);
    }
  }
  return next.toString();
}

/** The label for a category: translated when we know it, the raw key otherwise. */
export function categoryLabel(t: PluginsTranslate, category: string): string {
  return PLUGIN_CATEGORIES.includes(category) ? t(`plugins.categories.${category}`) : category;
}

/** A scope arrives as an id string or as an object; the page shows the id and the description when present. */
export function normalizeScope(scope: PluginScope | string): PluginScope {
  return typeof scope === 'string' ? { id: scope } : scope;
}
