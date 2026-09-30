/** Stable codes the client maps to translated text. Never 404/405/501 for a refusal: the extension reads those as "route missing". */
export enum ArtifactErrorCode {
  TOO_LARGE = 'ARTIFACT_TOO_LARGE',
  NOT_TEXT = 'ARTIFACT_NOT_TEXT',
  HASH_MISMATCH = 'ARTIFACT_HASH_MISMATCH',
  CONTAINS_SECRET = 'ARTIFACT_CONTAINS_SECRET',
  ZERO_RETENTION = 'ARTIFACT_ZERO_RETENTION',
  NOT_FOUND = 'ARTIFACT_NOT_FOUND',
}
