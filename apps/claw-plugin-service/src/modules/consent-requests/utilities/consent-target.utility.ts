import { TargetKind } from '../../../common/enums/target-kind.enum';
import { type CatalogTarget, type InvokeTarget } from '../../runtime/types/invoke.types';

/** The target a request or a grant is pinned to: the install id, or the server id. */
export function targetKeyOf(target: InvokeTarget): string {
  return target.installId ?? target.serverId ?? target.slug;
}

function catalogName(target: CatalogTarget): string {
  const translations = target.manifest.translations as Record<string, { name?: string }>;
  return translations['en']?.name ?? target.slug;
}

/** The plugin name the card shows: the catalog entry's English name, or the server's slug. */
export function pluginNameOf(target: InvokeTarget): string {
  return target.kind === TargetKind.CATALOG ? catalogName(target) : target.slug;
}
