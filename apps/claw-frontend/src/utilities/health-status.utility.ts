export function getHealthStatusColor(status: string | null): string {
  if (status === 'healthy') {
    return 'bg-emerald-500';
  }
  if (status === 'degraded') {
    return 'bg-amber-500';
  }
  return 'bg-destructive';
}
