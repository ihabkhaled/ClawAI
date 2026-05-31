import { ConnectorStatus } from '@/enums';

// Returns the Tailwind class used for the small status dot rendered on the
// connector card. Status dots: green=healthy, yellow=degraded, red=down,
// slate=unknown.
export function getConnectorStatusDotTone(status: ConnectorStatus): string {
  switch (status) {
    case ConnectorStatus.HEALTHY:
      return 'bg-emerald-500';
    case ConnectorStatus.DEGRADED:
      return 'bg-amber-500';
    case ConnectorStatus.DOWN:
      return 'bg-red-500';
    default:
      return 'bg-slate-400';
  }
}

// Returns the i18n key for the human-readable status label.
export function getConnectorStatusLabelKey(status: ConnectorStatus): string {
  switch (status) {
    case ConnectorStatus.HEALTHY:
      return 'connectors.healthy';
    case ConnectorStatus.DEGRADED:
      return 'connectors.degraded';
    case ConnectorStatus.DOWN:
      return 'connectors.error';
    default:
      return 'common.unknown';
  }
}
