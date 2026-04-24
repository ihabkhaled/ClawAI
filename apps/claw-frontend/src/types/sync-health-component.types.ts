import type { FreshnessBand } from '../enums/freshness-band.enum';

import type { TranslateFunction } from './i18n.types';
import type { ConnectorSyncHealth, SyncHealthDashboard } from './workspace-sync.types';

export type StaleChipProps = {
  band: FreshnessBand;
  label: string;
};

export type SyncHealthRowProps = {
  row: ConnectorSyncHealth;
  t: TranslateFunction;
};

export type SyncHealthDashboardViewProps = {
  dashboard: SyncHealthDashboard;
  t: TranslateFunction;
};
