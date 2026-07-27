function assertPositiveMinorUnits(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}

export function calculateRemainingRefundableMinor(
  capturedMinor: number,
  reservedRefundsMinor: ReadonlyArray<number>,
): number {
  assertPositiveMinorUnits(capturedMinor, 'capturedMinor');
  let reservedMinor = 0;
  for (const refundMinor of reservedRefundsMinor) {
    assertPositiveMinorUnits(refundMinor, 'refundMinor');
    reservedMinor += refundMinor;
    if (!Number.isSafeInteger(reservedMinor) || reservedMinor > capturedMinor) {
      throw new RangeError('refund ledger exceeds captured amount');
    }
  }
  return capturedMinor - reservedMinor;
}
