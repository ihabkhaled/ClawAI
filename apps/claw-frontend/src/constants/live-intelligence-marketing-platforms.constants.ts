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
 * absent: it has no public links, so the server cannot read it. Corrected 2026-11-24 from the real
 * link sweep (scripts/qa/live-platform-sweep.mjs): Vimeo (login wall), Reddit and Douyin (need
 * cookies) and Naver TV (extractor broken) failed and are not claimed; live-only link shapes say
 * recorded: false.
 */
export const LIVE_MARKETING_PLATFORMS: ReadonlyArray<LiveMarketingPlatform> = [
  { name: 'YouTube', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'Facebook', group: G.SOCIAL, live: true, recorded: true },
  { name: 'Twitch', group: G.GAMING_STREAMING, live: true, recorded: true },
  { name: 'Kick', group: G.GAMING_STREAMING, live: true, recorded: true },
  { name: 'TikTok', group: G.SOCIAL, live: true, recorded: true },
  { name: 'Instagram', group: G.SOCIAL, live: true, recorded: true },
  { name: 'Dailymotion', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'X (Twitter)', group: G.SOCIAL, live: true, recorded: true },
  { name: 'Rumble', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'Bilibili', group: G.ASIA, live: true, recorded: false },
  { name: 'Niconico', group: G.ASIA, live: true, recorded: true },
  { name: 'VK Video', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'OK.ru', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'Rutube', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'Odysee', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'Streamable', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Mixcloud', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Bluesky', group: G.SOCIAL, live: true, recorded: true },
  { name: 'Weibo', group: G.ASIA, live: false, recorded: true },
  { name: 'Kakao TV', group: G.ASIA, live: true, recorded: true },
  { name: 'TwitCasting', group: G.ASIA, live: true, recorded: true },
  { name: 'Trovo', group: G.GAMING_STREAMING, live: true, recorded: true },
  { name: 'DLive', group: G.GAMING_STREAMING, live: true, recorded: true },
  { name: 'Huya', group: G.ASIA, live: true, recorded: false },
  { name: 'Douyu', group: G.ASIA, live: true, recorded: false },
  { name: 'Picarto', group: G.GAMING_STREAMING, live: true, recorded: false },
  { name: 'SHOWROOM', group: G.ASIA, live: true, recorded: false },
  { name: '17LIVE', group: G.ASIA, live: true, recorded: false },
  { name: 'BIGO LIVE', group: G.ASIA, live: true, recorded: false },
  { name: 'LinkedIn Live', group: G.SOCIAL, live: true, recorded: false },
  { name: 'Telegram', group: G.SOCIAL, live: true, recorded: false },
  { name: 'CHZZK', group: G.ASIA, live: true, recorded: false },
  { name: 'SOOP', group: G.ASIA, live: true, recorded: false },
  { name: 'Nimo TV', group: G.ASIA, live: true, recorded: false },
];
