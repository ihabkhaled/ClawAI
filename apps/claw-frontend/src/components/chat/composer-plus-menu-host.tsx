'use client';

import { ComposerPlusMenuContextHost } from '@/components/chat/composer-plus-menu-context-host';
import { ComposerPlusMenuDraftHost } from '@/components/chat/composer-plus-menu-draft-host';
import { ComposerPlusMenuView } from '@/components/chat/composer-plus-menu-view';
import type { ComposerPlusMenuHostProps } from '@/types/composer-plus-menu.types';

/**
 * Which "+" menu a surface gets. A thread has packs, memory and a preview of its own; a surface
 * with no thread yet (Compare, the labs) may still pick packs, which ride with the run; the bare
 * new-chat menu has neither.
 */
export function ComposerPlusMenuHost(props: ComposerPlusMenuHostProps): React.ReactElement {
  if (props.threadId !== null) {
    return <ComposerPlusMenuContextHost {...props} threadId={props.threadId} />;
  }
  if (props.draftContextPacks === undefined) {
    return <ComposerPlusMenuView {...props} context={null} />;
  }
  return <ComposerPlusMenuDraftHost {...props} draftContextPacks={props.draftContextPacks} />;
}
