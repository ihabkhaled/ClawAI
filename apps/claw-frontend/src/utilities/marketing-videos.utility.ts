import {
  MARKETING_ARABIC_SCRIPT_PATTERN,
  MARKETING_LOCAL_VIDEO_PART_COUNT,
  MARKETING_VIDEOS,
  MARKETING_VIDEOS_KEY_PREFIX,
  YOUTUBE_EMBED_ORIGIN,
  YOUTUBE_EMBED_PATH_PREFIX,
  YOUTUBE_EMBED_QUERY,
} from '@/constants/marketing-videos.constants';
import { Locale } from '@/enums/locale.enum';
import { MarketingVideoKind } from '@/enums/marketing-video-kind.enum';
import type { MarketingVideoPlacement } from '@/enums/marketing-video-placement.enum';
import type { TranslateFunction } from '@/types/i18n.types';
import type {
  MarketingLocalVideo,
  MarketingShortVideo,
  MarketingVideoEntry,
  MarketingVideoView,
} from '@/types/marketing-videos.types';

/** The registry entries shown at a placement, Arabic-titled Shorts first on the Arabic site. */
export function getMarketingVideosForPlacement(
  placement: MarketingVideoPlacement,
  locale: Locale,
): ReadonlyArray<MarketingVideoEntry> {
  const entries = MARKETING_VIDEOS.filter((entry) => entry.placements.includes(placement));
  if (locale !== Locale.AR) {
    return entries;
  }
  const rank = (entry: MarketingVideoEntry): number =>
    entry.kind === MarketingVideoKind.SHORT && MARKETING_ARABIC_SCRIPT_PATTERN.test(entry.title)
      ? 0
      : 1;
  // Array.prototype.toSorted is stable, so the registry order survives within each group.
  return entries.toSorted((a, b) => rank(a) - rank(b));
}

/** The privacy-enhanced embed URL a facade swaps in when it is clicked. */
export function buildYouTubeEmbedUrl(videoId: string): string {
  return `${YOUTUBE_EMBED_ORIGIN}${YOUTUBE_EMBED_PATH_PREFIX}${encodeURIComponent(videoId)}?${YOUTUBE_EMBED_QUERY}`;
}

/** schema.org wants an ISO 8601 duration: 30 becomes `PT30S`, 90 becomes `PT1M30S`. */
export function formatIsoDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const minutePart = minutes > 0 ? `${minutes}M` : '';
  const secondPart = seconds > 0 || minutes === 0 ? `${seconds}S` : '';
  return `PT${minutePart}${secondPart}`;
}

/** A path under `public/` made absolute against the site origin. */
export function toAbsoluteSiteUrl(path: string, siteUrl: string): string {
  return new URL(path, siteUrl).toString();
}

export function isLocalVideo(entry: MarketingVideoEntry): entry is MarketingLocalVideo {
  return entry.kind === MarketingVideoKind.LOCAL;
}

/** The YouTube title as published; `#n` is added only to tell the same-titled Shorts apart. */
function buildShortTitle(short: MarketingShortVideo): string {
  return short.part === undefined ? short.title : `${short.title} #${short.part}`;
}

/** Resolves one registry entry's text for one locale. */
export function buildMarketingVideoView(
  entry: MarketingVideoEntry,
  t: TranslateFunction,
): MarketingVideoView {
  if (isLocalVideo(entry)) {
    return {
      kind: MarketingVideoKind.LOCAL,
      id: entry.id,
      src: entry.src,
      posterSrc: entry.posterSrc,
      width: entry.width,
      height: entry.height,
      title: t(entry.titleKey, { n: entry.part ?? 1, total: MARKETING_LOCAL_VIDEO_PART_COUNT }),
      description: t(entry.descriptionKey),
      durationLabel: t(`${MARKETING_VIDEOS_KEY_PREFIX}.durationLabel`, {
        seconds: entry.durationSeconds,
      }),
    };
  }

  const title = buildShortTitle(entry);
  return {
    kind: MarketingVideoKind.SHORT,
    id: entry.id,
    thumbnailSrc: entry.thumbnailSrc,
    title,
    playLabel: t(`${MARKETING_VIDEOS_KEY_PREFIX}.facade.play`, { title }),
    frameTitle: t(`${MARKETING_VIDEOS_KEY_PREFIX}.facade.frameTitle`, { title }),
    embedUrl: buildYouTubeEmbedUrl(entry.id),
  };
}
