import type { LiveIntelligencePlatformGroupProps } from '@/types/live-intelligence-marketing.types';

/** One group of platforms: its heading, what it is, and each platform with what it supports. */
export function LiveIntelligencePlatformGroup({
  view,
  liveTag,
  videoTag,
}: LiveIntelligencePlatformGroupProps): React.ReactElement {
  const headingId = `platform-group-${view.group}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-foreground text-lg font-semibold">
        {view.copy.title}
      </h3>
      <p className="editorial-comparison__body">{view.copy.body}</p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {view.platforms.map((platform) => (
          <li
            key={platform.name}
            data-platform={platform.name}
            className="border-border bg-card flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
          >
            <span dir="ltr" className="text-foreground font-medium">
              {platform.name}
            </span>
            <span className="text-muted-foreground flex shrink-0 gap-2 text-xs">
              {platform.live ? <span>{liveTag}</span> : null}
              {platform.recorded ? <span>{videoTag}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
