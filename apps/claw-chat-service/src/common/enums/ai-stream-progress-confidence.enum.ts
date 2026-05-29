// How trustworthy a reported progress percent is. The UI must label the
// percent as estimated unless it is EXACT (provider gave exact totals).
export enum AiStreamProgressConfidence {
  EXACT = 'exact',
  PROVIDER_REPORTED = 'provider_reported',
  ESTIMATED = 'estimated',
  STAGE_BASED = 'stage_based',
  UNKNOWN = 'unknown',
}
