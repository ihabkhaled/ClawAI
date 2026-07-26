import Link from 'next/link';

import type { PublicSharedChatFooterProps } from '@/types';

/**
 * The page's closing block: a link home, a way to report the page, and the
 * disclaimer.
 *
 * The home link is plain navigation. There is deliberately no "continue this chat",
 * no fork, and no import — this page is a viewing surface, and an action that
 * copied the conversation into a visitor's account would turn one owner's decision
 * to publish into an unbounded set of copies they can no longer revoke.
 *
 * The report link goes to the contact route rather than a form here: a reporter
 * must be able to flag a page without being able to touch its content, and
 * routing through the existing contact flow means no new write path is exposed on
 * an unauthenticated page.
 */
export function PublicSharedChatFooter({
  homeLabel,
  homeHref,
  reportLabel,
  reportHref,
  disclaimer,
}: PublicSharedChatFooterProps): React.ReactElement {
  return (
    <footer className="mt-8 border-t pt-4">
      <p className="text-muted-foreground text-xs">{disclaimer}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <Link
          href={homeHref}
          className="text-primary underline underline-offset-2 hover:no-underline"
        >
          {homeLabel}
        </Link>
        <Link
          href={reportHref}
          className="text-muted-foreground underline underline-offset-2 hover:no-underline"
        >
          {reportLabel}
        </Link>
      </div>
    </footer>
  );
}
