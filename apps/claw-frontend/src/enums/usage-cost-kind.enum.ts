/** How trustworthy a cost figure is. Mirrors auth-service UsageCostKind. */
export enum UsageCostKind {
  Priced = 'PRICED',
  Fallback = 'FALLBACK',
  Unpriced = 'UNPRICED',
  Unmetered = 'UNMETERED',
}
