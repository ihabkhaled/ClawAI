import { Badge } from '@/components/ui/badge';
import type { LiveSupportedPlatformsProps } from '@/types/live.types';
import {
  countLiveMarketingPlatforms,
  sortedLiveMarketingPlatforms,
} from '@/utilities/live-intelligence-marketing-content.utility';

/**
 * Every platform Live & Videos reads, on the in-app page (owner 2026-11-26: "write down all the
 * platforms we support"). The same list as the public platforms page; names are brands, never translated.
 */
export function LiveSupportedPlatforms({ t }: LiveSupportedPlatformsProps): React.ReactElement {
  const counts = countLiveMarketingPlatforms();
  return (
    <details
      className="border-border bg-card group rounded-lg border p-4"
      data-testid="live-supported-platforms"
    >
      <summary className="text-foreground flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-medium">
        <span>{t('live.platform.supportedTitle')}</span>
        <span className="text-muted-foreground text-xs font-normal">
          {t('live.platform.supportedCount', {
            live: String(counts.live),
            videos: String(counts.videos),
          })}
        </span>
      </summary>
      <p className="text-muted-foreground mt-3 text-xs">{t('live.platform.supportedHint')}</p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sortedLiveMarketingPlatforms().map((platform) => (
          <li
            key={platform.name}
            className="border-border flex min-w-0 items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <span className="text-foreground truncate text-sm" title={platform.name}>
              {platform.name}
            </span>
            <span className="flex shrink-0 gap-1">
              {platform.live ? (
                <Badge variant="secondary">{t('live.platform.supportedLiveTag')}</Badge>
              ) : null}
              {platform.recorded ? (
                <Badge variant="outline">{t('live.platform.supportedVideoTag')}</Badge>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
