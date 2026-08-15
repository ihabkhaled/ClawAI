function joinFieldValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string').join(', ');
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

export function formatApiFieldErrors(errors: unknown): string {
  if (Array.isArray(errors)) {
    const byField = new Map<string, string[]>();
    for (const entry of errors) {
      if (typeof entry === 'string') {
        byField.set('', [...(byField.get('') ?? []), entry]);
        continue;
      }
      if (entry && typeof entry === 'object' && 'message' in entry) {
        const rawField = (entry as { field?: unknown }).field;
        const field = typeof rawField === 'string' ? rawField : '';
        const message = String((entry as { message: unknown }).message);
        byField.set(field, [...(byField.get(field) ?? []), message]);
      }
    }
    return [...byField.entries()]
      .map(([field, msgs]) => (field ? `${field}: ${msgs.join(', ')}` : msgs.join(', ')))
      .join('; ');
  }
  if (errors && typeof errors === 'object') {
    return Object.entries(errors as Record<string, unknown>)
      .map(([field, value]) => {
        const joined = joinFieldValue(value);
        if (!joined) {
          return '';
        }
        return field ? `${field}: ${joined}` : joined;
      })
      .filter(Boolean)
      .join('; ');
  }
  return '';
}
