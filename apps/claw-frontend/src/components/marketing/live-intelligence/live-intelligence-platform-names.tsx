import type { LiveIntelligencePlatformNamesProps } from '@/types/live-intelligence-marketing.types';

/** Platform names as a wrapping row of chips. Brand names: never translated, always left to right. */
export function LiveIntelligencePlatformNames({
  names,
}: LiveIntelligencePlatformNamesProps): React.ReactElement {
  return (
    <ul className="flex flex-wrap gap-2">
      {names.map((name) => (
        <li
          key={name}
          dir="ltr"
          className="border-border bg-muted text-foreground rounded-full border px-3 py-1 text-sm"
        >
          {name}
        </li>
      ))}
    </ul>
  );
}
