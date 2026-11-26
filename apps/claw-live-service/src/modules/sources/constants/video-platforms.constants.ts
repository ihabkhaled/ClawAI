import { LivePlatform } from '../../../generated/prisma';
import type { VideoPlatformHosts } from '../types/platform.types';

/**
 * Platforms added 2026-11-24 (ADR-221 batch 6, owner decision "all recommended"): matched by host
 * only, the path kept as the platform's own id. The server reads each with yt-dlp (live → shared
 * SERVER_PULL, recorded → RECORDED); a link it cannot read stays LINK_ONLY. Parsing only.
 * `keepQuery` names the query params that identify the video (everything else is dropped).
 */
export const VIDEO_PLATFORM_HOSTS: readonly VideoPlatformHosts[] = [
  {
    platform: LivePlatform.DAILYMOTION,
    hosts: ['dailymotion.com', 'www.dailymotion.com', 'dai.ly'],
  },
  {
    platform: LivePlatform.X,
    hosts: ['x.com', 'www.x.com', 'mobile.x.com', 'twitter.com', 'www.twitter.com'],
  },
  { platform: LivePlatform.VIMEO, hosts: ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'] },
  { platform: LivePlatform.TROVO, hosts: ['trovo.live', 'www.trovo.live'] },
  { platform: LivePlatform.DLIVE, hosts: ['dlive.tv', 'www.dlive.tv'] },
  { platform: LivePlatform.HUYA, hosts: ['huya.com', 'www.huya.com', 'm.huya.com'] },
  { platform: LivePlatform.DOUYU, hosts: ['douyu.com', 'www.douyu.com', 'm.douyu.com'] },
  {
    platform: LivePlatform.DOUYIN,
    hosts: ['douyin.com', 'www.douyin.com', 'live.douyin.com', 'v.douyin.com'],
  },
  { platform: LivePlatform.TWITCASTING, hosts: ['twitcasting.tv', 'www.twitcasting.tv'] },
  {
    platform: LivePlatform.NICONICO,
    hosts: ['nicovideo.jp', 'www.nicovideo.jp', 'sp.nicovideo.jp', 'live.nicovideo.jp', 'nico.ms'],
  },
  { platform: LivePlatform.PICARTO, hosts: ['picarto.tv', 'www.picarto.tv'] },
  { platform: LivePlatform.ODYSEE, hosts: ['odysee.com', 'www.odysee.com'] },
  { platform: LivePlatform.RUTUBE, hosts: ['rutube.ru', 'www.rutube.ru'] },
  {
    platform: LivePlatform.VK,
    hosts: ['vk.com', 'www.vk.com', 'm.vk.com', 'vkvideo.ru', 'www.vkvideo.ru', 'vk.ru'],
    keepQuery: ['z'],
  },
  { platform: LivePlatform.OK, hosts: ['ok.ru', 'www.ok.ru', 'm.ok.ru'] },
  {
    platform: LivePlatform.REDDIT,
    hosts: ['reddit.com', 'www.reddit.com', 'old.reddit.com', 'v.redd.it'],
  },
  { platform: LivePlatform.STREAMABLE, hosts: ['streamable.com', 'www.streamable.com'] },
  { platform: LivePlatform.NAVER_TV, hosts: ['tv.naver.com', 'm.tv.naver.com'] },
  { platform: LivePlatform.KAKAO_TV, hosts: ['tv.kakao.com'] },
  {
    platform: LivePlatform.WEIBO,
    hosts: ['weibo.com', 'www.weibo.com', 'm.weibo.cn', 'video.weibo.com'],
    keepQuery: ['fid'],
  },
  { platform: LivePlatform.SHOWROOM, hosts: ['showroom-live.com', 'www.showroom-live.com'] },
  { platform: LivePlatform.LIVE17, hosts: ['17.live', 'www.17.live'] },
  { platform: LivePlatform.MIXCLOUD, hosts: ['mixcloud.com', 'www.mixcloud.com'] },
  { platform: LivePlatform.BLUESKY, hosts: ['bsky.app'] },
  // Round 2 (owner 2026-11-26): each read by yt-dlp with a real link that day (ADR-221).
  {
    platform: LivePlatform.VK_PLAY_LIVE,
    hosts: ['live.vkvideo.ru', 'live.vkplay.ru', 'vkplay.live'],
  },
  { platform: LivePlatform.PEERTUBE, hosts: ['framatube.org', 'garr.tv'] },
  { platform: LivePlatform.STEAM, hosts: ['store.steampowered.com', 'steamcommunity.com'] },
  { platform: LivePlatform.GOODGAME, hosts: ['goodgame.ru', 'www.goodgame.ru'] },
  { platform: LivePlatform.YOUNOW, hosts: ['younow.com', 'www.younow.com'] },
  { platform: LivePlatform.RAIPLAY, hosts: ['raiplay.it', 'www.raiplay.it'] },
  { platform: LivePlatform.RAIPLAY_SOUND, hosts: ['raiplaysound.it', 'www.raiplaysound.it'] },
  { platform: LivePlatform.BFMTV, hosts: ['bfmtv.com', 'www.bfmtv.com'] },
  { platform: LivePlatform.CBS_NEWS, hosts: ['cbsnews.com', 'www.cbsnews.com'] },
  { platform: LivePlatform.LRT, hosts: ['lrt.lt', 'www.lrt.lt'] },
  { platform: LivePlatform.FRANCE_TV, hosts: ['france.tv', 'www.france.tv'] },
  { platform: LivePlatform.ROYA, hosts: ['roya.tv', 'www.roya.tv'] },
  { platform: LivePlatform.MATCH_TV, hosts: ['matchtv.ru', 'www.matchtv.ru'] },
  { platform: LivePlatform.RTVC_PLAY, hosts: ['rtvcplay.co', 'www.rtvcplay.co'] },
  { platform: LivePlatform.TUNEIN, hosts: ['tunein.com', 'www.tunein.com'] },
  {
    platform: LivePlatform.WEBCAMERA_PL,
    hosts: ['webcamera.pl', 'www.webcamera.pl'],
    hostSuffixes: ['webcamera.pl'],
  },
  { platform: LivePlatform.TED, hosts: ['ted.com', 'www.ted.com', 'embed.ted.com'] },
  {
    platform: LivePlatform.SOUNDCLOUD,
    hosts: ['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com'],
  },
  { platform: LivePlatform.BANDCAMP, hosts: ['bandcamp.com'], hostSuffixes: ['bandcamp.com'] },
  { platform: LivePlatform.ARCHIVE_ORG, hosts: ['archive.org', 'www.archive.org'] },
  { platform: LivePlatform.NINEGAG, hosts: ['9gag.com', 'www.9gag.com'] },
  { platform: LivePlatform.PINTEREST, hosts: ['pinterest.com', 'www.pinterest.com', 'pin.it'] },
  {
    platform: LivePlatform.BITCHUTE,
    hosts: ['bitchute.com', 'www.bitchute.com', 'old.bitchute.com'],
  },
  { platform: LivePlatform.GOOGLE_DRIVE, hosts: ['drive.google.com'] },
  {
    platform: LivePlatform.DROPBOX,
    hosts: ['dropbox.com', 'www.dropbox.com'],
    keepQuery: ['rlkey'],
  },
  { platform: LivePlatform.LOOM, hosts: ['loom.com', 'www.loom.com'] },
  { platform: LivePlatform.SPREAKER, hosts: ['spreaker.com', 'www.spreaker.com'] },
  { platform: LivePlatform.APPLE_PODCASTS, hosts: ['podcasts.apple.com'], keepQuery: ['i'] },
  { platform: LivePlatform.MEDAL, hosts: ['medal.tv', 'www.medal.tv'] },
  { platform: LivePlatform.UN_WEB_TV, hosts: ['webtv.un.org'] },
  { platform: LivePlatform.ZHIHU, hosts: ['zhihu.com', 'www.zhihu.com'] },
  { platform: LivePlatform.CNN, hosts: ['cnn.com', 'www.cnn.com', 'edition.cnn.com'] },
  { platform: LivePlatform.VIDLII, hosts: ['vidlii.com', 'www.vidlii.com'], keepQuery: ['v'] },
  { platform: LivePlatform.FLICKR, hosts: ['flickr.com', 'www.flickr.com'] },
  { platform: LivePlatform.ACFUN, hosts: ['acfun.cn', 'www.acfun.cn', 'm.acfun.cn'] },
  { platform: LivePlatform.IMGUR, hosts: ['imgur.com', 'www.imgur.com', 'i.imgur.com'] },
];

/** A path segment we keep: the characters any of these platforms put in a video, user or room id. */
export const VIDEO_PLATFORM_SEGMENT_PATTERN = /^[\w@.:~+-]{1,128}$/u;
export const VIDEO_PLATFORM_MAX_SEGMENTS = 8;

/** Official player embeds the frontend allows (`LIVE_EMBED_ALLOWED_ORIGINS`). */
export const DAILYMOTION_EMBED_BASE_URL = 'https://www.dailymotion.com/embed/video/';
export const DAILYMOTION_SHORT_HOST = 'dai.ly';
export const VIMEO_EMBED_BASE_URL = 'https://player.vimeo.com/video/';
export const VIMEO_VIDEO_ID_PATTERN = /^\d{5,15}$/u;

/** VK's live listing links `live-<owner>_<id>`; only `video-<owner>_<id>` reads (2026-11-26). */
export const VK_LIVE_PREFIX = 'live-';
export const VK_VIDEO_PREFIX = 'video-';
/** GoodGame's `/channel/<user>` page; the readable form is `/<user>`. */
export const GOODGAME_CHANNEL_SEGMENT = 'channel';
