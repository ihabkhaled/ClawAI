export type PublicationSafetyResult = {
  approved: boolean;
  reasons: Array<'POSSIBLE_SECRET' | 'POSSIBLE_PII'>;
};
