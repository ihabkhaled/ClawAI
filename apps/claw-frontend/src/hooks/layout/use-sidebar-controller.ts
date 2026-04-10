import { usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { useSidebarStore } from '@/stores/sidebar.store';
import type { UseSidebarControllerReturn } from '@/types';
import { logger } from '@/utilities';

export function useSidebarController(): UseSidebarControllerReturn {
  const { isOpen, close } = useSidebarStore();
  const pathname = usePathname();

  useEffect(() => {
    close();
  }, [pathname, close]);

  const handleOverlayClick = useCallback((): void => {
    logger.debug({ component: 'layout', action: 'sidebar-close', message: 'Sidebar closed via overlay click' });
    close();
  }, [close]);

  return { isOpen, close, handleOverlayClick };
}
