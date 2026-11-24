import { LiveSourceErrorCode } from '../../../common/enums/live-source-error-code.enum';
import { LiveCapability, LivePlatform, LiveSourceKind } from '../../../generated/prisma';
import type { PlatformDefinition } from '../types/platform.types';
import {
  parseFacebookUrl,
  parseKickUrl,
  parseTwitchUrl,
} from '../utilities/capture-platform-url.utility';
import {
  parseBigoUrl,
  parseBilibiliUrl,
  parseChzzkUrl,
  parseDiscordUrl,
  parseInstagramUrl,
  parseLinkedinUrl,
  parseNimoUrl,
  parseRumbleUrl,
  parseSoopUrl,
  parseTelegramUrl,
  parseTiktokUrl,
} from '../utilities/link-platform-url.utility';
import { parseYoutubeChannelUrl, parseYoutubeVideoUrl } from '../utilities/youtube-url.utility';

/** Defaults of a platform row; each row overrides what differs. */
const PLATFORM_DEFAULTS = {
  sourceKind: LiveSourceKind.PLATFORM,
  capability: LiveCapability.LINK_ONLY,
  refusalCode: null,
  embedNeedsParent: false,
  chatNeedsEmbedDomain: false,
} as const;

/**
 * The platform registry (architecture section 1): tried in order, first match wins.
 * BROWSER_CAPTURE = the platform has an official player embed, so the viewer can share
 * that tab's audio; LINK_ONLY = no embeddable player, the UI links out. Parsing only.
 */
export const LIVE_PLATFORM_REGISTRY: readonly PlatformDefinition[] = [
  {
    ...PLATFORM_DEFAULTS,
    platform: LivePlatform.YOUTUBE,
    sourceKind: LiveSourceKind.YOUTUBE,
    capability: LiveCapability.BROWSER_CAPTURE,
    chatNeedsEmbedDomain: true,
    parse: parseYoutubeVideoUrl,
  },
  {
    ...PLATFORM_DEFAULTS,
    platform: LivePlatform.YOUTUBE,
    sourceKind: LiveSourceKind.YOUTUBE,
    capability: LiveCapability.BROWSER_CAPTURE,
    // No chat until server pull finds the live video id; then YouTube needs `embed_domain`.
    chatNeedsEmbedDomain: true,
    parse: parseYoutubeChannelUrl,
  },
  {
    ...PLATFORM_DEFAULTS,
    platform: LivePlatform.TWITCH,
    capability: LiveCapability.BROWSER_CAPTURE,
    embedNeedsParent: true,
    parse: parseTwitchUrl,
  },
  {
    ...PLATFORM_DEFAULTS,
    platform: LivePlatform.KICK,
    capability: LiveCapability.BROWSER_CAPTURE,
    parse: parseKickUrl,
  },
  {
    ...PLATFORM_DEFAULTS,
    platform: LivePlatform.FACEBOOK,
    capability: LiveCapability.BROWSER_CAPTURE,
    parse: parseFacebookUrl,
  },
  { ...PLATFORM_DEFAULTS, platform: LivePlatform.TIKTOK, parse: parseTiktokUrl },
  { ...PLATFORM_DEFAULTS, platform: LivePlatform.INSTAGRAM, parse: parseInstagramUrl },
  { ...PLATFORM_DEFAULTS, platform: LivePlatform.RUMBLE, parse: parseRumbleUrl },
  { ...PLATFORM_DEFAULTS, platform: LivePlatform.BIGO, parse: parseBigoUrl },
  { ...PLATFORM_DEFAULTS, platform: LivePlatform.LINKEDIN, parse: parseLinkedinUrl },
  { ...PLATFORM_DEFAULTS, platform: LivePlatform.TELEGRAM, parse: parseTelegramUrl },
  { ...PLATFORM_DEFAULTS, platform: LivePlatform.BILIBILI, parse: parseBilibiliUrl },
  { ...PLATFORM_DEFAULTS, platform: LivePlatform.CHZZK, parse: parseChzzkUrl },
  { ...PLATFORM_DEFAULTS, platform: LivePlatform.SOOP, parse: parseSoopUrl },
  { ...PLATFORM_DEFAULTS, platform: LivePlatform.NIMO, parse: parseNimoUrl },
  {
    ...PLATFORM_DEFAULTS,
    platform: LivePlatform.DISCORD,
    capability: null,
    refusalCode: LiveSourceErrorCode.DISCORD_PRIVATE,
    parse: parseDiscordUrl,
  },
];
