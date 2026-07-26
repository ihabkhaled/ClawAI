import type { PublicSharedChatHeaderProps } from '@/types';

/**
 * The page's heading block.
 *
 * The `h1` is the chat title and nothing else — no owner name, no avatar, no
 * account link. A visitor gets the conversation; who had it is not part of the
 * contract.
 *
 * `snapshotDisclaimer` is not decoration: without it a reader has no way to know
 * they are looking at a point-in-time copy rather than a live conversation, which
 * changes how they should read a dated answer.
 */
export function PublicSharedChatHeader({
  title,
  publishedLabel,
  updatedLabel,
  messageCountLabel,
  snapshotDisclaimer,
}: PublicSharedChatHeaderProps): React.ReactElement {
  return (
    <header className="border-b pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h1>
      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
        <span>{publishedLabel}</span>
        <span aria-hidden="true">·</span>
        <span>{updatedLabel}</span>
        <span aria-hidden="true">·</span>
        <span>{messageCountLabel}</span>
      </div>
      <p className="text-muted-foreground mt-3 text-xs">{snapshotDisclaimer}</p>
    </header>
  );
}
