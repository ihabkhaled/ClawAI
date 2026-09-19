/** The fields fitting reads; research evidence items satisfy it. */
export type FittableEvidence = {
  title: string | null;
  url: string;
  snippet: string;
};

export type EvidenceFitResult<T> = {
  items: T[];
  /** Items read but left out to fit the model's context. */
  omitted: number;
};
