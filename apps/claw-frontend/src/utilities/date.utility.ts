export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatOptionalIsoDate(iso: string | null): string {
  if (iso === null) {
    return '—';
  }
  return new Date(iso).toLocaleString();
}

export function formatDateTimeSafe(iso: string | null | undefined, fallback = '—'): string {
  if (iso === null || iso === undefined || iso === '') {
    return fallback;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return date.toLocaleString();
}
