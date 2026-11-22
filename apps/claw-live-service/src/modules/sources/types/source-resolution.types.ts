import type { LiveCapability, LiveSourceKind } from '../../../generated/prisma';

/** Result of SourcesService.resolve(url, userId). Owned by the sources module. */
export interface SourceResolution {
  sourceKind: LiveSourceKind;
  capability: LiveCapability;
  /** sha256 of the normalized identity. */
  sourceIdentity: string;
  /** 'PUBLIC' or 'PRIVATE:<userId>'. */
  accessScope: string;
  normalizedUrl: string;
  declaredHost: string | null;
  /** youtube-nocookie embed URL for YOUTUBE; null otherwise (HLS plays through the proxy). */
  embedUrl: string | null;
  /** Machine code shown when capability is PLAYER_ONLY, e.g. 'YOUTUBE_ANALYSIS_NOT_PERMITTED'. */
  reasonCode: string | null;
}
