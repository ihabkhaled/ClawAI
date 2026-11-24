import type {
  LiveIntelligenceMarketingImage,
  LiveIntelligenceMarketingVideo,
} from '@/types/live-intelligence-marketing.types';

/**
 * The public landing page for Live & Video Intelligence (the URL keeps its original name so links
 * and rankings survive the rename). `/live` itself is the signed-in portal screen.
 */
export const LIVE_INTELLIGENCE_MARKETING_PATH = '/features/live-intelligence';

/** The registry slug: the path without its leading slash. SEO copy lives in live-intelligence-seo.constants.ts. */
export const LIVE_INTELLIGENCE_SLUG = 'features/live-intelligence';

/** The second public page: every platform, grouped. */
export const LIVE_INTELLIGENCE_PLATFORMS_PATH = '/features/live-intelligence/platforms';

export const LIVE_INTELLIGENCE_PLATFORMS_SLUG = 'features/live-intelligence/platforms';

/** Where a signed-in user pastes a link. */
export const LIVE_INTELLIGENCE_PORTAL_PATH = '/live';

/** Where a new visitor creates an account. Always localised with `localisePath`. */
export const LIVE_INTELLIGENCE_SIGN_UP_PATH = '/register';

/** The day the page media was first published (schema.org `uploadDate`). */
export const LIVE_INTELLIGENCE_MEDIA_UPLOAD_DATE = '2026-11-24';

/** Anchor ids for the in-page section nav. Stable by contract: they end up in deep links. */
export const LIVE_INTELLIGENCE_SECTION_IDS = {
  videos: 'see-it-work',
  steps: 'how-it-works',
  screenshots: 'screens',
  outcomes: 'what-you-get',
  ways: 'two-ways',
  modes: 'analysis-modes',
  languages: 'languages',
  platforms: 'platforms',
  limits: 'limits',
  faq: 'questions',
} as const;

/** Anchor ids on the platforms page. */
export const LIVE_INTELLIGENCE_PLATFORMS_SECTION_IDS = {
  groups: 'platforms',
  support: 'what-works',
  limits: 'limits',
  faq: 'questions',
} as const;

const VIDEO_BASE = '/marketing/videos';

/**
 * The two portrait clips the owner supplied, already H.264 (720x1280). Order matches the
 * dictionary's `videos` captions: the promo first, then the phone demo.
 */
export const LIVE_INTELLIGENCE_MARKETING_VIDEOS: ReadonlyArray<LiveIntelligenceMarketingVideo> = [
  {
    id: 'live-and-videos-promo',
    src: `${VIDEO_BASE}/live-and-videos-promo.mp4`,
    posterSrc: `${VIDEO_BASE}/live-and-videos-promo-poster.jpg`,
    width: 720,
    height: 1280,
    durationSeconds: 13,
  },
  {
    id: 'live-and-videos-demo',
    src: `${VIDEO_BASE}/live-and-videos-demo.mp4`,
    posterSrc: `${VIDEO_BASE}/live-and-videos-demo-poster.jpg`,
    width: 720,
    height: 1280,
    durationSeconds: 17,
  },
];

const SCREENSHOT_BASE = '/marketing/live-and-videos';

/**
 * Real phone screenshots (390x844, dark theme) captured from the running app. Order matches the
 * dictionary's `screenshots` captions: paste a link, the live feed, a video summary.
 */
export const LIVE_INTELLIGENCE_MARKETING_SCREENSHOTS: ReadonlyArray<LiveIntelligenceMarketingImage> =
  [
    { src: `${SCREENSHOT_BASE}/paste-link.png`, width: 390, height: 844 },
    { src: `${SCREENSHOT_BASE}/live-feed.png`, width: 390, height: 844 },
    { src: `${SCREENSHOT_BASE}/video-summary.png`, width: 390, height: 844 },
  ];
