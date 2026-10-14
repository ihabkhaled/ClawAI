import { PLUGIN_REFS_MAX, PLUGIN_REFS_METADATA_KEY } from '../constants/plugin-tools.constants';
import { pluginRefSchema } from '../dto/plugin-fields.dto';
import type { AssembledContext } from '../types/context.types';
import type { PluginRef } from '../types/plugin-tools.types';

/**
 * The refs a message carries, read defensively from its metadata JSON.
 * Anything malformed is dropped rather than failing the turn, duplicates
 * (same install and tool) collapse, and the list is capped.
 */
export function readPluginRefs(metadata: unknown): PluginRef[] {
  if (typeof metadata !== 'object' || metadata === null) return [];
  const raw: unknown = Reflect.get(metadata, PLUGIN_REFS_METADATA_KEY);
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const refs: PluginRef[] = [];
  for (const entry of raw) {
    const parsed = pluginRefSchema.safeParse(entry);
    if (!parsed.success) continue;
    const key = `${parsed.data.installId}:${parsed.data.toolName ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(parsed.data);
    if (refs.length === PLUGIN_REFS_MAX) break;
  }
  return refs;
}

/** The request refs when the surface sent some, otherwise the latest user turn's. */
export function pluginRefsFor(
  requested: readonly PluginRef[] | undefined,
  latestUserMetadata: unknown,
): PluginRef[] {
  return requested !== undefined && requested.length > 0
    ? readPluginRefs({ [PLUGIN_REFS_METADATA_KEY]: requested })
    : readPluginRefs(latestUserMetadata);
}

export function withPluginRefs(
  context: AssembledContext,
  refs: readonly PluginRef[],
): AssembledContext {
  return refs.length === 0 ? context : { ...context, pluginRefs: refs };
}

export function withoutPluginRefs(context: AssembledContext): AssembledContext {
  const { pluginRefs: _dropped, ...rest } = context;
  return rest;
}

export function hasPluginRefs(context: AssembledContext | undefined): boolean {
  return (context?.pluginRefs?.length ?? 0) > 0;
}

/** The `pluginRefs` key for a user message's metadata, or nothing when there are none. */
export function pluginRefsMetadata(refs: readonly PluginRef[] | undefined): {
  pluginRefs?: PluginRef[];
} {
  const clean = pluginRefsFor(refs, undefined);
  return clean.length === 0 ? {} : { [PLUGIN_REFS_METADATA_KEY]: clean };
}
