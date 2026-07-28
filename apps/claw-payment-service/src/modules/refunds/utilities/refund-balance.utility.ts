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

export function calculateProviderRefundMinor(
  capturedMinor: number,
  providerCapturedMinor: number,
  requestedMinor: number,
  remainingMinor: number,
  reservedProviderMinor: ReadonlyArray<number>,
): number {
  assertPositiveMinorUnits(capturedMinor, 'capturedMinor');
  assertPositiveMinorUnits(providerCapturedMinor, 'providerCapturedMinor');
  assertPositiveMinorUnits(requestedMinor, 'requestedMinor');
  assertPositiveMinorUnits(remainingMinor, 'remainingMinor');
  const providerRemaining = calculateRemainingRefundableMinor(
    providerCapturedMinor,
    reservedProviderMinor,
  );
  if (requestedMinor > remainingMinor) {
    throw new RangeError('requested refund exceeds the canonical remainder');
  }
  if (requestedMinor === remainingMinor) {
    return providerRemaining;
  }

  const proportional =
    (BigInt(providerCapturedMinor) * BigInt(requestedMinor)) / BigInt(capturedMinor);
  const allocated = Number(proportional === 0n ? 1n : proportional);
  if (!Number.isSafeInteger(allocated) || allocated > providerRemaining) {
    throw new RangeError('provider refund exceeds the captured provider amount');
  }
  return allocated;
}
