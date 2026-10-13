import { MarketingVideoKind } from '@/enums/marketing-video-kind.enum';
import { MarketingVideoLayout } from '@/enums/marketing-video-layout.enum';
import { MarketingVideoPlacement } from '@/enums/marketing-video-placement.enum';
import type {
  MarketingVideoEntry,
  MarketingVideoPlacementConfig,
} from '@/types/marketing-videos.types';

/** The only third-party host a marketing page may frame, and only after a click. */
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

export const YOUTUBE_EMBED_PATH_PREFIX = '/embed/';

export const YOUTUBE_EMBED_QUERY = 'autoplay=1&rel=0&playsinline=1';

export const YOUTUBE_IFRAME_ALLOW = 'autoplay; encrypted-media; picture-in-picture';

/** The day the videos were first published on the site (schema.org `uploadDate`). */
export const MARKETING_VIDEO_UPLOAD_DATE = '2026-10-13';

export const MARKETING_VIDEOS_PUBLIC_DIR = 'marketing/videos';

export const MARKETING_VIDEOS_KEY_PREFIX = 'marketing.videos';

export const MARKETING_LOCAL_VIDEO_WIDTH = 1280;

export const MARKETING_LOCAL_VIDEO_HEIGHT = 720;

/** A title containing Arabic script is Arabic-titled (the audio language is not claimed). */
export const MARKETING_ARABIC_SCRIPT_PATTERN = /\p{Script=Arabic}/u;

/** How many parts the split Threads video has. */
export const MARKETING_LOCAL_VIDEO_PART_COUNT = 3;

const VIDEO_BASE = `/${MARKETING_VIDEOS_PUBLIC_DIR}`;
const SHORTS_BASE = `${VIDEO_BASE}/shorts`;
const K = MARKETING_VIDEOS_KEY_PREFIX;

/** YouTube titles, verbatim. The four open-source Shorts share one title. */
const SHORT_TITLE_OVERVIEW = 'ClawAI — Open-Source Local-First AI Orchestration Platform';
const SHORT_TITLE_OPEN_SOURCE =
  'ClawAI — منصة Open Source بتشغّل وتوجّه موديلات الـ AI محليًا وعلى الكلاود';

const localVideo = (
  id: string,
  group: string,
  durationSeconds: number,
  placements: MarketingVideoEntry['placements'],
  part?: number,
): MarketingVideoEntry => ({
  kind: MarketingVideoKind.LOCAL,
  id,
  src: `${VIDEO_BASE}/${id}.mp4`,
  posterSrc: `${VIDEO_BASE}/${id}-poster.jpg`,
  width: MARKETING_LOCAL_VIDEO_WIDTH,
  height: MARKETING_LOCAL_VIDEO_HEIGHT,
  durationSeconds,
  titleKey: `${K}.local.${group}.title`,
  descriptionKey: `${K}.local.${group}.description`,
  ...(part === undefined ? {} : { part }),
  placements,
});

const shortVideo = (
  id: string,
  title: string,
  placements: MarketingVideoEntry['placements'],
  part?: number,
): MarketingVideoEntry => ({
  kind: MarketingVideoKind.SHORT,
  id,
  thumbnailSrc: `${SHORTS_BASE}/${id}.jpg`,
  title,
  ...(part === undefined ? {} : { part }),
  placements,
});

/**
 * Every marketing video, in display order within its placement. One registry: the components,
 * the structured data and the tests all read this list, so a video is added in one place.
 */
export const MARKETING_VIDEOS: ReadonlyArray<MarketingVideoEntry> = [
  localVideo('clawai-threads-combined', 'combined', 30, [
    MarketingVideoPlacement.HOME_THREADS,
    MarketingVideoPlacement.THREADS_OVERVIEW,
    MarketingVideoPlacement.THREADS_DISCOVER,
  ]),
  localVideo('clawai-part-1', 'part', 10, [MarketingVideoPlacement.THREADS_OVERVIEW_STEPS], 1),
  localVideo('clawai-part-2', 'part', 10, [MarketingVideoPlacement.THREADS_OVERVIEW_STEPS], 2),
  localVideo('clawai-part-3', 'part', 10, [MarketingVideoPlacement.THREADS_OVERVIEW_STEPS], 3),

  shortVideo('ZuKqBODBH2k', SHORT_TITLE_OVERVIEW, [MarketingVideoPlacement.HOME_ACTION]),
  shortVideo('CfxYCdcNibQ', 'clawai بيجمعلك موديلات ذكااء اصطناعي في مكان واحد', [
    MarketingVideoPlacement.HOME_ACTION,
  ]),
  shortVideo('3tsb9axusWA', 'مكان واحد في موديلات ذكاء اصطناعي كثيرة ClawAI', [
    MarketingVideoPlacement.HOME_ACTION,
  ]),

  shortVideo('QvYbIApKT3M', 'ذكاء اصطناعي مجاني', [
    MarketingVideoPlacement.PRICING,
    MarketingVideoPlacement.SUPPORTED_MODELS,
    MarketingVideoPlacement.MODEL_PROVIDERS,
  ]),
  shortVideo('m6WZLeTl80Y', 'ذكاء اصطناعي مجاني موديلات الصينية', [
    MarketingVideoPlacement.PRICING,
    MarketingVideoPlacement.SUPPORTED_MODELS,
    MarketingVideoPlacement.MODEL_PROVIDERS,
  ]),

  shortVideo('9sECnKbvxZE', SHORT_TITLE_OPEN_SOURCE, [MarketingVideoPlacement.LOCAL_FIRST_AI], 1),
  shortVideo('zcdv4Jyo1LE', SHORT_TITLE_OPEN_SOURCE, [MarketingVideoPlacement.HOW_IT_WORKS], 2),
  shortVideo('apX5d9hJPQo', SHORT_TITLE_OPEN_SOURCE, [MarketingVideoPlacement.ARCHITECTURE], 3),
  shortVideo('VXdm870CELM', SHORT_TITLE_OPEN_SOURCE, [MarketingVideoPlacement.INTEGRATIONS], 4),
];

const SHORTS_SECTION = {
  layout: MarketingVideoLayout.SHORTS,
  headingKey: `${K}.shortsSection.title`,
  introKey: `${K}.shortsSection.body`,
} as const;

export const MARKETING_VIDEO_PLACEMENTS: Readonly<
  Record<MarketingVideoPlacement, MarketingVideoPlacementConfig>
> = {
  [MarketingVideoPlacement.HOME_ACTION]: {
    sectionId: 'see-it-in-action',
    layout: MarketingVideoLayout.SHORTS,
    headingKey: `${K}.action.title`,
    introKey: `${K}.action.body`,
  },
  // The host band already has its own heading and copy.
  [MarketingVideoPlacement.HOME_THREADS]: {
    sectionId: 'threads-video',
    layout: MarketingVideoLayout.FEATURE,
    headingKey: null,
    introKey: null,
  },
  [MarketingVideoPlacement.THREADS_OVERVIEW]: {
    sectionId: 'threads-video',
    layout: MarketingVideoLayout.FEATURE,
    headingKey: `${K}.threadsSection.title`,
    introKey: `${K}.threadsSection.body`,
  },
  [MarketingVideoPlacement.THREADS_OVERVIEW_STEPS]: {
    sectionId: 'threads-made',
    layout: MarketingVideoLayout.STEPS,
    headingKey: `${K}.stepsSection.title`,
    introKey: `${K}.stepsSection.body`,
  },
  [MarketingVideoPlacement.THREADS_DISCOVER]: {
    sectionId: 'threads-video',
    layout: MarketingVideoLayout.FEATURE,
    headingKey: `${K}.threadsSection.title`,
    introKey: `${K}.threadsSection.body`,
  },
  [MarketingVideoPlacement.PRICING]: { sectionId: 'videos', ...SHORTS_SECTION },
  [MarketingVideoPlacement.SUPPORTED_MODELS]: { sectionId: 'videos', ...SHORTS_SECTION },
  [MarketingVideoPlacement.MODEL_PROVIDERS]: { sectionId: 'videos', ...SHORTS_SECTION },
  [MarketingVideoPlacement.LOCAL_FIRST_AI]: { sectionId: 'videos', ...SHORTS_SECTION },
  [MarketingVideoPlacement.HOW_IT_WORKS]: { sectionId: 'videos', ...SHORTS_SECTION },
  [MarketingVideoPlacement.ARCHITECTURE]: { sectionId: 'videos', ...SHORTS_SECTION },
  [MarketingVideoPlacement.INTEGRATIONS]: { sectionId: 'videos', ...SHORTS_SECTION },
};
