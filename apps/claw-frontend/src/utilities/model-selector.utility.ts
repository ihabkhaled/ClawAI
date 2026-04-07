export function encodeModelValue(provider: string, model: string): string {
  return `${provider}::${model}`;
}

export function decodeModelValue(value: string): { provider: string; model: string } | null {
  const parts = value.split('::');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { provider: parts[0], model: parts[1] };
}
