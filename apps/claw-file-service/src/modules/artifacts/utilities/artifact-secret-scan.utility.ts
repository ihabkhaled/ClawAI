import { ARTIFACT_SECRET_PATTERNS } from '../constants/artifact-secret-patterns.constants';

/** True when any credential shape appears in the text. The match itself is never returned or logged. */
export function containsArtifactSecret(content: string): boolean {
  return ARTIFACT_SECRET_PATTERNS.some((pattern) => pattern.test(content));
}
