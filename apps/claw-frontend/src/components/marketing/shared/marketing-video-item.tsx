import { MarketingVideo } from '@/components/marketing/shared/marketing-video';
import { YouTubeShortFacade } from '@/components/marketing/shared/youtube-short-facade';
import { MarketingVideoKind } from '@/enums/marketing-video-kind.enum';
import type { MarketingVideoItemProps } from '@/types/marketing-videos.types';

/** One resolved video: a self-hosted clip or a YouTube Short facade. */
export function MarketingVideoItem({ item }: MarketingVideoItemProps): React.ReactElement {
  return item.kind === MarketingVideoKind.LOCAL ? (
    <MarketingVideo video={item} />
  ) : (
    <YouTubeShortFacade short={item} />
  );
}
