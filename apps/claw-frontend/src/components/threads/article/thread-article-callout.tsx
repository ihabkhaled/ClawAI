import { Info, Lightbulb, TriangleAlert } from 'lucide-react';
import type { ReactElement } from 'react';

import { ThreadCalloutKind } from '@/constants/thread-article.constants';
import { cn } from '@/lib/utils';
import type { ThreadArticleCalloutProps } from '@/types/thread-article.types';

/**
 * A Note, Tip or Warning box. Colour is never the only signal: an icon and a screen-reader label
 * carry the kind too. Text on background is well above 7:1 in both themes (950 on 50 shades).
 */
export function ThreadArticleCallout({
  kind,
  labels,
  children,
}: ThreadArticleCalloutProps): ReactElement {
  const isWarning = kind === ThreadCalloutKind.Warning;
  const isTip = kind === ThreadCalloutKind.Tip;
  let Icon = Info;
  let label = labels.note;
  if (isWarning) {
    Icon = TriangleAlert;
    label = labels.warning;
  } else if (isTip) {
    Icon = Lightbulb;
    label = labels.tip;
  }
  return (
    <blockquote
      data-callout={kind}
      className={cn(
        'my-6 flex break-inside-avoid gap-3 rounded-lg border border-s-4 p-4',
        kind === ThreadCalloutKind.Note &&
          'border-sky-300 border-s-sky-700 bg-sky-50 text-sky-950 dark:border-sky-800 dark:border-s-sky-400 dark:bg-sky-950/60 dark:text-sky-50',
        isTip &&
          'border-emerald-300 border-s-emerald-700 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:border-s-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-50',
        isWarning &&
          'border-amber-300 border-s-amber-700 bg-amber-50 text-amber-950 dark:border-amber-800 dark:border-s-amber-400 dark:bg-amber-950/60 dark:text-amber-50',
      )}
    >
      <Icon className="mt-1 size-5 shrink-0" aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <div className="min-w-0 [&>p]:my-1 [&>p]:leading-7">{children}</div>
    </blockquote>
  );
}
