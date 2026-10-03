import { ComposerContextPackPicker } from '@/components/chat/composer-context-pack-picker';
import { ComposerContextPacksView } from '@/components/chat/composer-context-packs-view';
import { ComposerMemoryView } from '@/components/chat/composer-memory-view';
import type { ComposerContextControlProps } from '@/types/composer-context.types';

/**
 * Context packs and memory, made visible in the composer toolbar: pick the
 * packs this chat carries, see what they put in the next message, and see the
 * memory in use. Each is a fixed-width, shrink-0 control, so the toolbar row
 * scrolls instead of squeezing them (rules/40 §11).
 */
export function ComposerContextControls(props: ComposerContextControlProps): React.ReactElement {
  return (
    <>
      <ComposerContextPackPicker {...props} />
      <ComposerContextPacksView {...props} />
      <ComposerMemoryView {...props} />
    </>
  );
}
