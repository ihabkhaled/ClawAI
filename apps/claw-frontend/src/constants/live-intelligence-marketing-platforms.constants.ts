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
 * absent: it has no public links, so the server cannot read it. Only platforms that passed a real
 * link through POST /live/sources/resolve are listed, with what passed (live = SERVER_PULL AND real
 * captions in a session, recorded = RECORDED): 18 on 2026-11-25, 58 on 2026-11-26 (30 live, 39 recorded; owner: "write down all the
 * platforms we support"). Failed or untested ones (Vimeo, Reddit, Douyin, Naver TV, SHOWROOM, Huya,
 * Douyu, Bluesky, Kakao TV, DLive, Trovo, 17LIVE, BIGO, Telegram, Nimo, Dropbox, PandaLive) are still
 * recognised by the service but are not claimed here (ADR-221).
 */
export const LIVE_MARKETING_PLATFORMS: ReadonlyArray<LiveMarketingPlatform> = [
  { name: 'YouTube', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'Facebook', group: G.SOCIAL, live: false, recorded: true },
  { name: 'Twitch', group: G.GAMING_STREAMING, live: true, recorded: true },
  { name: 'Kick', group: G.GAMING_STREAMING, live: true, recorded: false },
  { name: 'TikTok', group: G.SOCIAL, live: true, recorded: true },
  { name: 'Instagram', group: G.SOCIAL, live: false, recorded: true },
  { name: 'Dailymotion', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'X (Twitter)', group: G.SOCIAL, live: false, recorded: true },
  { name: 'Rumble', group: G.GLOBAL_VIDEO, live: true, recorded: false },
  { name: 'Bilibili', group: G.ASIA, live: true, recorded: true },
  { name: 'Niconico', group: G.ASIA, live: false, recorded: true },
  { name: 'VK Video', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'VK Video Live', group: G.GAMING_STREAMING, live: true, recorded: false },
  { name: 'OK.ru', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Rutube', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'Odysee', group: G.GLOBAL_VIDEO, live: true, recorded: true },
  { name: 'Streamable', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Mixcloud', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Picarto', group: G.GAMING_STREAMING, live: true, recorded: false },
  { name: 'PeerTube', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Steam', group: G.GAMING_STREAMING, live: false, recorded: true },
  { name: 'GoodGame', group: G.GAMING_STREAMING, live: true, recorded: false },
  { name: 'CHZZK', group: G.ASIA, live: true, recorded: false },
  { name: 'SOOP', group: G.ASIA, live: true, recorded: false },
  { name: 'RaiPlay', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'RaiPlay Sound', group: G.GLOBAL_VIDEO, live: true, recorded: false },
  { name: 'BFMTV', group: G.GLOBAL_VIDEO, live: true, recorded: false },
  { name: 'CBS News', group: G.GLOBAL_VIDEO, live: true, recorded: false },
  { name: 'LRT', group: G.GLOBAL_VIDEO, live: true, recorded: false },
  { name: 'Roya TV', group: G.GLOBAL_VIDEO, live: true, recorded: false },
  { name: 'RTVC Play', group: G.GLOBAL_VIDEO, live: true, recorded: false },
  { name: 'TuneIn', group: G.GLOBAL_VIDEO, live: true, recorded: false },
  { name: 'TED', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'SoundCloud', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Bandcamp', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Internet Archive', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: '9GAG', group: G.SOCIAL, live: false, recorded: true },
  { name: 'Pinterest', group: G.SOCIAL, live: false, recorded: true },
  { name: 'BitChute', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Google Drive', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Loom', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Spreaker', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Apple Podcasts', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Medal', group: G.GAMING_STREAMING, live: false, recorded: true },
  { name: 'UN Web TV', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Zhihu', group: G.ASIA, live: false, recorded: true },
  { name: 'CNN', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'VidLii', group: G.GLOBAL_VIDEO, live: false, recorded: true },
  { name: 'Flickr', group: G.SOCIAL, live: false, recorded: true },
  { name: 'AcFun', group: G.ASIA, live: false, recorded: true },
  { name: 'Weibo', group: G.ASIA, live: false, recorded: true },
  { name: 'Imgur', group: G.SOCIAL, live: false, recorded: true },
  { name: 'LinkedIn', group: G.SOCIAL, live: false, recorded: true },
];
