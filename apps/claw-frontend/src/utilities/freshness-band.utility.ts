import { FreshnessBand } from '../enums/freshness-band.enum';

export function computeFreshnessBand(
  lastSyncAt: string | null,
  cadenceSeconds: number,
  multiplier = 3,
): FreshnessBand {
  if (lastSyncAt === null) {
    return FreshnessBand.STALE;
  }
  const parsed = new Date(lastSyncAt).getTime();
  if (Number.isNaN(parsed)) {
    return FreshnessBand.STALE;
  }
  const ageSeconds = (Date.now() - parsed) / 1000;
  if (ageSeconds <= cadenceSeconds) {
    return FreshnessBand.FRESH;
  }
  if (ageSeconds <= cadenceSeconds * multiplier) {
    return FreshnessBand.SLOW;
  }
  return FreshnessBand.STALE;
}

export function formatRelativeAge(lastSyncAt: string | null): string {
  if (lastSyncAt === null) {
    return 'never';
  }
  const parsed = new Date(lastSyncAt).getTime();
  if (Number.isNaN(parsed)) {
    return 'unknown';
  }
  const diff = Date.now() - parsed;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
