import { useEffect } from 'react';

import { useComposerDropTargetStore } from '@/stores/composer-drop-target.store';

/**
 * Makes this composer the target of a file dropped anywhere on the chat panel,
 * for as long as it is mounted. Unregisters only itself, so a remount racing
 * an unmount never clears the newer composer's registration.
 */
export function useRegisterComposerDropTarget(ingest: (files: FileList | File[]) => void): void {
  const register = useComposerDropTargetStore((state) => state.register);
  const unregister = useComposerDropTargetStore((state) => state.unregister);

  useEffect(() => {
    register(ingest);
    return () => {
      unregister(ingest);
    };
  }, [ingest, register, unregister]);
}
