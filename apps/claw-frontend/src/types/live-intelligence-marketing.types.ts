import type { LiveMarketingPlatformGroup } from '@/enums/live-marketing-platform-group.enum';
import type {
  LiveIntelligenceMarketingGroupCopy,
  LiveIntelligenceMarketingItem,
  LiveIntelligenceMarketingWaysRow,
} from '@/types/live-intelligence-marketing-content.types';

/** One platform the public pages name. `name` is a brand and never translated. */
export type LiveMarketingPlatform = {
  name: string;
  group: LiveMarketingPlatformGroup;
  live: boolean;
  recorded: boolean;
};

/** A self-hosted portrait clip. */
export type LiveIntelligenceMarketingVideo = {
  id: string;
  src: string;
  posterSrc: string;
  width: number;
  height: number;
  durationSeconds: number;
};

/** A screenshot with its intrinsic size, so the page reserves the box before it loads. */
export type LiveIntelligenceMarketingImage = {
  src: string;
  width: number;
  height: number;
};

/** A clip joined with its translated caption. */
export type LiveIntelligenceMarketingVideoView = LiveIntelligenceMarketingVideo & {
  caption: LiveIntelligenceMarketingItem;
};

/** A screenshot joined with its translated caption (title doubles as alt text). */
export type LiveIntelligenceMarketingImageView = LiveIntelligenceMarketingImage & {
  caption: LiveIntelligenceMarketingItem;
};

/** One group of platforms with its translated copy, ready to render. */
export type LiveMarketingPlatformGroupView = {
  group: LiveMarketingPlatformGroup;
  copy: LiveIntelligenceMarketingGroupCopy;
  platforms: ReadonlyArray<LiveMarketingPlatform>;
};

export type LiveIntelligenceVideoPairProps = {
  videos: ReadonlyArray<LiveIntelligenceMarketingVideoView>;
};

export type LiveIntelligenceScreenshotStripProps = {
  screenshots: ReadonlyArray<LiveIntelligenceMarketingImageView>;
};

export type LiveIntelligenceWaysTableProps = {
  caption: string;
  aspect: string;
  live: string;
  summary: string;
  rows: ReadonlyArray<LiveIntelligenceMarketingWaysRow>;
};

export type LiveIntelligenceItemListProps = {
  items: ReadonlyArray<LiveIntelligenceMarketingItem>;
  ordered?: boolean;
};

export type LiveIntelligencePlatformGroupProps = {
  view: LiveMarketingPlatformGroupView;
  liveTag: string;
  videoTag: string;
};

export type LiveIntelligencePlatformNamesProps = {
  names: ReadonlyArray<string>;
};
