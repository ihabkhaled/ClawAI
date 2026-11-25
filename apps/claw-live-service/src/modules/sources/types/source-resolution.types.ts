import type { LiveCapability, LivePlatform, LiveSourceKind } from '../../../generated/prisma';

/** Result of SourcesService.resolve(url, userId). Owned by the sources module. */
export interface SourceResolution {
  sourceKind: LiveSourceKind;
  capability: LiveCapability;
  /** sha256 of the normalized identity (`<PLATFORM>:<id>` for registry platforms). */
  sourceIdentity: string;
  /** 'PUBLIC' or 'PRIVATE:<userId>' (every BROWSER_CAPTURE source is PRIVATE to its viewer). */
  accessScope: string;
  normalizedUrl: string;
  declaredHost: string | null;
  /** The platform's official player embed; null for HLS/FIXTURE (proxy) and LINK_ONLY platforms. */
  embedUrl: string | null;
  /** Machine code for the UI, e.g. 'BROWSER_CAPTURE_AVAILABLE' or 'LINK_ONLY_PLATFORM'. */
  reasonCode: string | null;
  /** The registry platform; null for HLS and FIXTURE. */
  platform: LivePlatform | null;
  /** The platform's official live-chat embed, or null when it offers none. */
  chatEmbedUrl: string | null;
  /** Canonical public page of a platform stream; '' for HLS/FIXTURE (a private URL is never echoed). */
  watchUrl: string;
  /** True when the frontend must append `&parent=<hostname>` to the player and chat (Twitch). */
  embedNeedsParent: boolean;
  /** True when the frontend must append `&embed_domain=<hostname>` to the chat (YouTube). */
  chatNeedsEmbedDomain: boolean;
  /** A RECORDED video's length when the site reports it (the summary estimate); null otherwise. */
  durationSeconds: number | null;
  /** The player is framed 9:16 (a vertical video); false for everything else. */
  portrait: boolean;
}
