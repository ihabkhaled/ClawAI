import type { LiveWatchLinkProps } from '@/types/live.types';

/** "Watch on <Platform>" under an embedded player (a stream whose owner blocks embedding still plays there). */
export function LiveWatchLink({ embed, t }: LiveWatchLinkProps): React.ReactElement | null {
  if (embed.watchUrl === null || embed.platformName === null) {
    return null;
  }
  return (
    <a
      href={embed.watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary self-end text-sm underline-offset-4 hover:underline"
    >
      {t('live.platform.watchOn', { platform: embed.platformName })}
    </a>
  );
}
