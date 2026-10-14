export type PublicationSafetyReason = 'POSSIBLE_SECRET' | 'POSSIBLE_PII';

export type PublicationSafetyResult = {
  approved: boolean;
  reasons: PublicationSafetyReason[];
};

export type PublicationSafetyFindingKind = 'SECRET' | 'EMAIL' | 'CARD' | 'SSN' | 'IBAN';

/** One flagged passage, shown only to the owner who wrote it. Secrets and card numbers are masked. */
export type PublicationSafetyFinding = {
  reason: PublicationSafetyReason;
  kind: PublicationSafetyFindingKind;
  excerpt: string;
};

export type PublicationSafetyReport = PublicationSafetyResult & {
  findings: PublicationSafetyFinding[];
};
