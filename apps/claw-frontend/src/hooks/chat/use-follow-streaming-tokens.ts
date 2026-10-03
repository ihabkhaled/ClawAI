import { useRef } from 'react';

import { useIsomorphicLayoutEffect } from '@/hooks/common/use-isomorphic-layout-effect';
import type { UseFollowStreamingTokensParams } from '@/types';

// Virtuoso's native followOutput callback only fires when the messages array
// grows (a new row is appended). During assistant streaming the LAST message's
// content grows in place — the array length stays constant — so the viewport
// never auto-follows the new tokens. useFollowStreamingTokens watches the
// last-message id + content length and imperatively calls
// virtuosoRef.scrollToIndex when content grows AND the user is still pinned
// to the bottom. Uses behavior: 'auto' so high-frequency token updates do
// not stutter; the JumpToLatest button uses smooth scroll for a deliberate
// jump.
//
// Skips firing when the user has scrolled up (isAtBottom === false) so the
// viewport never yanks them down while reading history.
export function useFollowStreamingTokens({
  virtuosoRef,
  isAtBottom,
  lastMessageId,
  lastContentLength,
  lastIndex,
  pinnedRef,
  progressSignal = 0,
}: UseFollowStreamingTokensParams): void {
  const previousIdRef = useRef<string | null>(null);
  const previousLengthRef = useRef<number>(0);
  const hasMountedRef = useRef<boolean>(false);
  const previousSignalRef = useRef<number>(progressSignal);

  useIsomorphicLayoutEffect(() => {
    const previousId = previousIdRef.current;
    const previousLength = previousLengthRef.current;
    const isNewMessage = previousId !== lastMessageId;
    const grew = lastContentLength > previousLength || progressSignal !== previousSignalRef.current;
    previousSignalRef.current = progressSignal;

    // Always commit the latest snapshot before any early return so subsequent
    // re-renders compare against the correct previous values.
    previousIdRef.current = lastMessageId;
    previousLengthRef.current = lastContentLength;

    // First render: only scroll if we are already pinned to the bottom AND
    // there is a real row to scroll to. Avoids fighting Virtuoso's
    // initialTopMostItemIndex on mount.
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      if (isAtBottom && lastIndex >= 0) {
        virtuosoRef.current?.scrollToIndex({
          index: lastIndex,
          behavior: 'auto',
          align: 'end',
        });
      }
      return;
    }

    // The controller's pin (reader has not scrolled up) wins over the distance
    // test, which a tall block of new content trips with no user action.
    const following = pinnedRef === undefined ? isAtBottom : pinnedRef.current;
    if (!following) {
      return;
    }
    if (lastIndex < 0) {
      return;
    }
    if (!isNewMessage && !grew) {
      return;
    }
    // 'LAST' includes the footer (progress stages, narration), which sits
    // below the final row and used to stay out of view.
    virtuosoRef.current?.scrollToIndex({
      index: 'LAST',
      behavior: 'auto',
      align: 'end',
    });
  }, [
    virtuosoRef,
    isAtBottom,
    lastMessageId,
    lastContentLength,
    lastIndex,
    pinnedRef,
    progressSignal,
  ]);
}
