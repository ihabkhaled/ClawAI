'use client';

import { Gavel, GitCompareArrows, Search } from 'lucide-react';

import { ChatThreadHeaderMenu } from '@/components/chat/chat-thread-header-menu';
import { ShareChatButton } from '@/components/chat-shares/share-chat-button';
import { Button } from '@/components/ui/button';
import type { ChatThreadActionRailProps } from '@/types';

/**
 * The thread's actions, stacked beside the conversation instead of above it.
 *
 * They used to sit on the header row: Compare, Judge & Referee, Find, Share and
 * the `…` menu, labelled from `lg` up. That row was the widest thing on the
 * page and it was spending the one resource a conversation cannot get back —
 * height. Rule 40 §1 says the transcript is the only element that grows; a band
 * of controls across the top is the opposite of that, because every pixel it
 * takes is taken at every scroll position, forever.
 *
 * Moving them to a vertical rail trades a scarce resource for an abundant one.
 * Height is shared with the transcript and the composer; the width beside the
 * bounded reading column is otherwise empty gutter on any screen wide enough to
 * have one. `.chat-thread-row` reserves that strip, so the reading column keeps
 * its full `--chat-content-max` rather than paying for the rail.
 *
 * **Inline-end, in both directions.** The rail is the LAST child of its flex
 * row, so the browser places it on the right in LTR and on the left in RTL with
 * no `dir` check and no physical class. That is the whole RTL story here — a
 * `right-*` utility would have needed an `rtl:` twin that somebody eventually
 * forgets.
 *
 * **Icon-only, always.** A rail wide enough for "Judge & Referee" is a sidebar,
 * and a sidebar is the horizontal cost this change exists to avoid. Each button
 * carries `aria-label` and `title`, which is the same contract the header row
 * used below `lg`; rule 40 §19 is satisfied because none of them has visible
 * text for the label to contradict.
 *
 * Below `sm` this component is not rendered at all — `showInlineActions` is
 * false there and every action is in the header's `…` menu, exactly as before.
 * A 360px screen has no gutter to put a rail in.
 */
export function ChatThreadActionRail(props: ChatThreadActionRailProps): React.ReactElement {
  return (
    <div
      // A stable hook for the responsive checks: the rail's whole contract is
      // WHERE it lands (inline-end, inside the row, never past the viewport
      // edge), and that can only be asserted by measuring the real element.
      data-chat-action-rail
      className="bg-card/40 flex shrink-0 flex-col items-center gap-0.5 self-start rounded-xl border p-1"
    >
      {props.canCompare ? (
        <Button
          variant={props.compareIsOpen ? 'default' : 'ghost'}
          size="icon-sm"
          onClick={props.onCompare}
          aria-label={props.compareLabel}
          title={props.compareLabel}
          aria-expanded={props.compareIsOpen}
        >
          <GitCompareArrows className="h-4 w-4" />
        </Button>
      ) : null}
      {props.canUseQualityControls ? (
        <Button
          variant={props.qualityIsOpen ? 'default' : 'ghost'}
          size="icon-sm"
          onClick={props.onQuality}
          aria-label={props.qualityLabel}
          title={props.qualityLabel}
          aria-expanded={props.qualityIsOpen}
        >
          <Gavel className="h-4 w-4" />
        </Button>
      ) : null}
      <Button
        variant={props.searchIsOpen ? 'default' : 'ghost'}
        size="icon-sm"
        onClick={props.onSearch}
        aria-label={props.searchLabel}
        title={props.searchLabel}
        aria-expanded={props.searchIsOpen}
      >
        <Search className="h-4 w-4" />
      </Button>
      <ShareChatButton {...props.shareButtonProps} />
      {/* The once-per-thread actions stay behind the `…`, separated from the
          four above them so the rail reads as "what I do to this answer" over
          "what I do to this thread". */}
      <div className="bg-border my-0.5 h-px w-5" aria-hidden />
      <ChatThreadHeaderMenu {...props.menuProps} />
    </div>
  );
}
