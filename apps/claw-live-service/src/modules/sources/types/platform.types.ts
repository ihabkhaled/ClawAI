import type { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import type { LiveCapability, LivePlatform, LiveSourceKind } from '../../../generated/prisma';

/** What one platform parser extracts from a URL (parsing only, never a network call). */
export interface PlatformMatch {
  /** Stable platform-local id (video id, channel, user); identity = sha256(`<PLATFORM>:<id>`). */
  id: string;
  /** Canonical public page. */
  watchUrl: string;
  embedUrl: string | null;
  chatEmbedUrl: string | null;
}

/** A URL parser for one platform: null when the URL is not that platform's live link. */
export type PlatformParser = (url: URL) => PlatformMatch | null;

/** One row of the platform registry (architecture section 1). */
export interface PlatformDefinition {
  platform: LivePlatform;
  sourceKind: LiveSourceKind;
  /** Null for a refused platform (refusalCode set). */
  capability: LiveCapability | null;
  /** Set when every link of this platform is refused (Discord). */
  refusalCode: LiveSourceErrorCode | null;
  embedNeedsParent: boolean;
  chatNeedsEmbedDomain: boolean;
  parse: PlatformParser;
}

export interface PlatformResolution {
  definition: PlatformDefinition;
  match: PlatformMatch;
}
