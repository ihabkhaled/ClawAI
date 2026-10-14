'use client';

import { ComposerPlusMenuView } from '@/components/chat/composer-plus-menu-view';
import { useDraftContextPacks } from '@/hooks/chat/use-draft-context-packs';
import type { ComposerPlusMenuDraftHostProps } from '@/types/composer-plus-menu.types';

/**
 * The "+" menu on a surface with no thread yet (Compare, the labs). Split out, like the thread
 * host, so the pack query runs only where a pack picker is shown. The packs picked here travel
 * with the run and are stored on the thread it creates.
 */
export function ComposerPlusMenuDraftHost(
  props: ComposerPlusMenuDraftHostProps,
): React.ReactElement {
  const { draftContextPacks } = props;
  const draftPacks = useDraftContextPacks(draftContextPacks);

  return <ComposerPlusMenuView {...props} context={null} draftPacks={draftPacks} />;
}
