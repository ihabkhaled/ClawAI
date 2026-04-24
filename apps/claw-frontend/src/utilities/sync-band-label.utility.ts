import { FreshnessBand } from '../enums/freshness-band.enum';
import type { TranslateFunction } from '../types/i18n.types';
import type { ConnectorSyncHealth } from '../types/workspace-sync.types';

export function getFreshnessBandLabel(band: FreshnessBand, t: TranslateFunction): string {
  if (band === FreshnessBand.FRESH) {
    return t('workspaceSync.band.fresh');
  }
  if (band === FreshnessBand.SLOW) {
    return t('workspaceSync.band.slow');
  }
  return t('workspaceSync.band.stale');
}

export function bandRank(band: FreshnessBand): number {
  if (band === FreshnessBand.STALE) {
    return 0;
  }
  if (band === FreshnessBand.SLOW) {
    return 1;
  }
  return 2;
}

export function compareConnectorsByFreshness(
  a: ConnectorSyncHealth,
  b: ConnectorSyncHealth,
): number {
  return bandRank(a.freshnessBand) - bandRank(b.freshnessBand);
}
