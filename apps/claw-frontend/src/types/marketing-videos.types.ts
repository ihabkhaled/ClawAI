import type { MarketingVideoKind } from '@/enums/marketing-video-kind.enum';
import type { MarketingVideoLayout } from '@/enums/marketing-video-layout.enum';
import type { MarketingVideoPlacement } from '@/enums/marketing-video-placement.enum';

/** A video we host ourselves (mp4 plus a jpg poster in `public/`). */
export type MarketingLocalVideo = {
  kind: MarketingVideoKind.LOCAL;
  /** Stable id, unique across the registry. */
  id: string;
  /** Public URL path of the mp4. */
  src: string;
  /** Public URL path of the poster image. */
  posterSrc: string;
  width: number;
  height: number;
  durationSeconds: number;
  titleKey: string;
  descriptionKey: string;
  /** 1-based part number when the clip is one of the three parts. */
  part?: number;
  placements: ReadonlyArray<MarketingVideoPlacement>;
};

/** A YouTube Short, embedded only after a click. */
export type MarketingShortVideo = {
  kind: MarketingVideoKind.SHORT;
  /** The YouTube video id. Unique across the registry. */
  id: string;
  /** Public URL path of the local thumbnail. */
  thumbnailSrc: string;
  /** The YouTube title, exactly as published. Never translated or paraphrased. */
  title: string;
  /** 1-based number that tells apart the Shorts that share one title. */
  part?: number;
  placements: ReadonlyArray<MarketingVideoPlacement>;
};

export type MarketingVideoEntry = MarketingLocalVideo | MarketingShortVideo;

/** What a placement shows around its videos. */
export type MarketingVideoPlacementConfig = {
  sectionId: string;
  layout: MarketingVideoLayout;
  /** Heading and intro keys; null when the host section already has its own. */
  headingKey: string | null;
  introKey: string | null;
};

/** A local video with its text already resolved for one locale. */
export type MarketingLocalVideoView = {
  kind: MarketingVideoKind.LOCAL;
  id: string;
  src: string;
  posterSrc: string;
  width: number;
  height: number;
  title: string;
  description: string;
  durationLabel: string;
};

/** A Short with its text already resolved for one locale. */
export type MarketingShortVideoView = {
  kind: MarketingVideoKind.SHORT;
  id: string;
  thumbnailSrc: string;
  title: string;
  playLabel: string;
  frameTitle: string;
  embedUrl: string;
};

export type MarketingVideoView = MarketingLocalVideoView | MarketingShortVideoView;

export type MarketingVideoSectionProps = {
  placement: MarketingVideoPlacement;
  /** Wrap in a centred, padded container. Off when the host already provides one. */
  contained?: boolean;
};

export type MarketingVideoGalleryProps = {
  layout: MarketingVideoLayout;
  items: ReadonlyArray<MarketingVideoView>;
};

export type MarketingVideoProps = {
  video: MarketingLocalVideoView;
};

export type YouTubeShortFacadeProps = {
  short: MarketingShortVideoView;
};

export type UseMarketingVideoReturn = {
  activated: boolean;
  activate: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

export type UseYouTubeFacadeReturn = {
  activated: boolean;
  activate: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
};

export type VideoObjectJsonLdInput = {
  name: string;
  description: string;
  thumbnailUrl: string;
  contentUrl: string;
  uploadDate: string;
  durationSeconds: number;
};

export type ThreadsBandSectionProps = {
  /** The explainer, rendered on the server and slotted in between the intro and the steps. */
  video?: React.ReactNode;
};

export type MarketingVideoItemProps = {
  item: MarketingVideoView;
};
