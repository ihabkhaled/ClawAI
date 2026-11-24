import { LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE } from '@/constants/live-intelligence-marketing-content.constants';
import {
  LIVE_MARKETING_PLATFORM_GROUP_ORDER,
  LIVE_MARKETING_PLATFORMS,
} from '@/constants/live-intelligence-marketing-platforms.constants';
import {
  LIVE_INTELLIGENCE_MARKETING_SCREENSHOTS,
  LIVE_INTELLIGENCE_MARKETING_VIDEOS,
  LIVE_INTELLIGENCE_MEDIA_UPLOAD_DATE,
} from '@/constants/live-intelligence-marketing.constants';
import type { Locale } from '@/enums/locale.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import type {
  LiveIntelligenceMarketingDictionary,
  LiveIntelligencePlatformsPageDictionary,
} from '@/types/live-intelligence-marketing-content.types';
import type {
  LiveIntelligenceMarketingImageView,
  LiveIntelligenceMarketingVideoView,
  LiveMarketingPlatformGroupView,
} from '@/types/live-intelligence-marketing.types';
import type { VideoObjectJsonLdInput } from '@/types/marketing-videos.types';
import { toAbsoluteSiteUrl } from '@/utilities/marketing-videos.utility';

/** The Live & Video Intelligence copy for one locale, falling back to English for a bad runtime string. */
export function getLiveIntelligenceMarketingContent(
  locale: Locale,
): LiveIntelligenceMarketingDictionary {
  return (
    LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[locale] ??
    LIVE_INTELLIGENCE_MARKETING_CONTENT_BY_LOCALE[DEFAULT_LOCALE]
  );
}

/** Each clip joined with its translated caption; a clip without a caption is dropped. */
export function buildLiveIntelligenceVideoViews(
  content: LiveIntelligenceMarketingDictionary,
): LiveIntelligenceMarketingVideoView[] {
  return LIVE_INTELLIGENCE_MARKETING_VIDEOS.flatMap((video, index) => {
    const caption = content.videos[index];
    return caption === undefined ? [] : [{ ...video, caption }];
  });
}

/** Each screenshot joined with its translated caption; one without a caption is dropped. */
export function buildLiveIntelligenceScreenshotViews(
  content: LiveIntelligenceMarketingDictionary,
): LiveIntelligenceMarketingImageView[] {
  return LIVE_INTELLIGENCE_MARKETING_SCREENSHOTS.flatMap((image, index) => {
    const caption = content.screenshots[index];
    return caption === undefined ? [] : [{ ...image, caption }];
  });
}

/** schema.org `VideoObject` input for the two clips, with absolute URLs. */
export function buildLiveIntelligenceVideoJsonLdInputs(
  videos: ReadonlyArray<LiveIntelligenceMarketingVideoView>,
  siteUrl: string,
): VideoObjectJsonLdInput[] {
  return videos.map((video) => ({
    name: video.caption.title,
    description: video.caption.body,
    thumbnailUrl: toAbsoluteSiteUrl(video.posterSrc, siteUrl),
    contentUrl: toAbsoluteSiteUrl(video.src, siteUrl),
    uploadDate: LIVE_INTELLIGENCE_MEDIA_UPLOAD_DATE,
    durationSeconds: video.durationSeconds,
  }));
}

/** The platforms in display order, grouped, each group with its translated copy. Empty groups are dropped. */
export function groupLiveMarketingPlatforms(
  page: LiveIntelligencePlatformsPageDictionary,
): LiveMarketingPlatformGroupView[] {
  return LIVE_MARKETING_PLATFORM_GROUP_ORDER.map((group) => ({
    group,
    copy: page.groups[group],
    platforms: LIVE_MARKETING_PLATFORMS.filter((platform) => platform.group === group),
  })).filter((view) => view.platforms.length > 0);
}

/** Every platform name, in registry order, for the teaser on the overview page. */
export function listLiveMarketingPlatformNames(): string[] {
  return LIVE_MARKETING_PLATFORMS.map((platform) => platform.name);
}
