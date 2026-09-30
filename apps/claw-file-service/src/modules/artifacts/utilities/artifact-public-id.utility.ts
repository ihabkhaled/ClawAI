import { randomBytes } from 'node:crypto';
import { ARTIFACT_PUBLIC_ID_BYTES } from '../constants/artifact.constants';

/** 192 bits from the CSPRNG, base64url. The only public handle on an artifact. */
export function generateArtifactPublicId(): string {
  return randomBytes(ARTIFACT_PUBLIC_ID_BYTES).toString('base64url');
}
