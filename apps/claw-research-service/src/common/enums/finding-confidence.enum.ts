/**
 * How sure a finding is, separate from how important it is. A `HIGH`
 * finding is directly observed; it says nothing about severity. See rule 41
 * item 13: a tag absent from fetched HTML is "not present in this markup,"
 * not "verified absent from the live page" — the confidence label carries
 * that distinction instead of letting a plain true/false imply more than
 * was actually checked.
 */
export enum FindingConfidence {
  /** Computed directly from data already collected — no interpretation. */
  CONFIRMED = 'CONFIRMED',
  /** Directly observed in the fetched markup, with a stated limitation. */
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  /** The check could not be performed with the data available. */
  UNVERIFIED = 'UNVERIFIED',
}
