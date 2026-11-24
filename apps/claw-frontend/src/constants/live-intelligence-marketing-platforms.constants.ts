import { LiveMarketingPlatformGroup } from '@/enums/live-marketing-platform-group.enum';
import type { LiveMarketingPlatform } from '@/types/live-intelligence-marketing.types';

/** The order the groups are shown in on the platforms page. */
export const LIVE_MARKETING_PLATFORM_GROUP_ORDER: ReadonlyArray<LiveMarketingPlatformGroup> = [
  LiveMarketingPlatformGroup.GLOBAL_VIDEO,
  LiveMarketingPlatformGroup.GAMING_STREAMING,
  LiveMarketingPlatformGroup.SOCIAL,
  LiveMarketingPlatformGroup.ASIA,
];

const G = LiveMarketingPlatformGroup;

/**
 * Every platform the public pages name, the ONE list both marketing pages read (owner decision
 * 2026-11-24). Names are brands and are never translated. `live` and `recorded` say what the page
 * claims for each platform; correct a row here and both pages follow. Discord is deliberately
 * absent: it has no public links, so the server cannot read it. Only platforms that passed the real
 * link sweep and Playwright rounds on 2026-11-25 are listed, with what passed (live, recorded);
 * failed or untested ones (Vimeo, Reddit, Douyin, Naver TV, CHZZK, SOOP, SHOWROOM, Huya, Douyu,
 * Bluesky, Kakao TV, DLive, Weibo, Trovo, TwitCasting, 17LIVE, BIGO, LinkedIn, Telegram, Nimo) are
 * still recognised by the service but are not claimed here (ADR-221 batch 6).
 */
export const LIVE_MARKETING_PLATFORMS: ReadonlyArray<LiveMarketingPlatform> = [
  { name: 'YouTube', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'Facebook', group: G.SOCIAL, live: false, recorded: true },
  { name: 'Twitch', group: G.GAMING_STREAMING, live: true, recorded: true },
  { name: 'Kick', group: G.GAMING_STREAMING, live: true, recorded: false },
  { name: 'TikTok', group: G.SOCIAL, live: false, recorded: true },
  { name: 'Instagram', group: G.SOCIAL, live: false, recorded: true },
  { name: 'Dailymotion', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'X (Twitter)', group: G.SOCIAL, live: false, recorded: true },
  { name: 'Rumble', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Bilibili', group: G.ASIA, live: true, recorded: false },
  { name: 'Niconico', group: G.ASIA, live: false, recorded: true },
  { name: 'VK Video', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'OK.ru', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Rutube', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'Odysee', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Streamable', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Mixcloud', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Picarto', group: G.GAMING_STREAMING, live: true, recorded: false },
];
