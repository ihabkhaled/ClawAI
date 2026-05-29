// Mirrors backend AiStreamProgressConfidence. The UI labels the percent as
// "estimated" unless this is EXACT.
export enum AiStreamProgressConfidence {
  EXACT = 'exact',
  PROVIDER_REPORTED = 'provider_reported',
  ESTIMATED = 'estimated',
  STAGE_BASED = 'stage_based',
  UNKNOWN = 'unknown',
}
