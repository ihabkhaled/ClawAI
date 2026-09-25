import { create } from 'zustand';

import type { ComposerDropTargetStore } from '@/types/composer-attachment.types';

/**
 * Where a file dropped anywhere on the chat panel goes.
 *
 * The panel (messages + composer) is the drop zone the user sees, but the
 * upload pipeline — antivirus, magic bytes, chunking, the selected list — lives
 * inside the composer's own hook. The composer registers its ingest function
 * while it is mounted; the panel reads it. One upload path, not two.
 */
export const useComposerDropTargetStore = create<ComposerDropTargetStore>()((set) => ({
  ingest: null,
  register: (ingest) => {
    set({ ingest });
  },
  unregister: (ingest) => {
    set((state) => (state.ingest === ingest ? { ingest: null } : state));
  },
}));
