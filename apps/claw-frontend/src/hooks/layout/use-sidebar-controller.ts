import { usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { useSidebarVisibleItems } from '@/hooks/layout/use-sidebar-visible-items';
import { useSidebarStore } from '@/stores/sidebar.store';
import type { UseSidebarControllerReturn } from '@/types';
import { logger } from '@/utilities';

export function useSidebarController(): UseSidebarControllerReturn {
  const { isOpen, close } = useSidebarStore();
  const { items } = useSidebarVisibleItems();
  const pathname = usePathname();

  // Auto-close the mobile drawer whenever the route changes.
  useEffect(() => {
    close();
  }, [pathname, close]);

  // While the mobile drawer is open, lock body scroll and let Escape close it.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  const handleOverlayClick = useCallback((): void => {
    logger.debug({
      component: 'layout',
      action: 'sidebar-close',
      message: 'Sidebar closed via overlay click',
    });
    close();
  }, [close]);

  return { isOpen, close, handleOverlayClick, items };
}
