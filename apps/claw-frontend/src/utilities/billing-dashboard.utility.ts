export function formatMicroUsd(value: string): string {
  const amount = BigInt(value);
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = absolute / 1_000_000n;
  const fraction = (absolute % 1_000_000n).toString().padStart(6, '0');
  return `${negative ? '-' : ''}USD ${whole.toString()}.${fraction}`;
}

export function formatBasisPoints(value: number): string {
  if (!Number.isSafeInteger(value)) {
    return '0.00%';
  }
  const whole = Math.trunc(value / 100);
  const fraction = Math.abs(value % 100)
    .toString()
    .padStart(2, '0');
  return `${String(whole)}.${fraction}%`;
}
