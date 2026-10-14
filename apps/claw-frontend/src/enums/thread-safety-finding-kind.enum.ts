/** What the sensitive-details scan found in a draft, as threads-service reports it. */
export enum ThreadSafetyFindingKind {
  Secret = 'SECRET',
  Email = 'EMAIL',
  Card = 'CARD',
  Ssn = 'SSN',
  Iban = 'IBAN',
}
