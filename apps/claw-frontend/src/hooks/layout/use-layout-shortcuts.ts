import { useCallback } from 'react';

import { useKeyboardShortcut } from '@/hooks/ui/use-keyboard-shortcut';
import { useSidebarStore } from '@/stores/sidebar.store';
import { logger } from '@/utilities';

// Layout-level keyboard shortcuts. Bound once at the PortalLayout level so
// they fire from any portal page without needing per-page wiring.
//
// Currently bound:
//   mod+b  → toggle sidebar (mod = ⌘ on macOS, Ctrl elsewhere)
//
// Cmd/Ctrl+K (global search) lives in `useGlobalSearchController` so it can
// also focus the search input as part of the toggle.
export function useLayoutShortcuts(): void {
  const { toggle } = useSidebarStore();

  const handleSidebarToggle = useCallback((): void => {
    logger.debug({
      component: 'layout',
      action: 'sidebar-toggle-shortcut',
      message: 'Sidebar toggled via Cmd/Ctrl+B',
    });
    toggle();
  }, [toggle]);

  useKeyboardShortcut('mod+b', handleSidebarToggle);
}
