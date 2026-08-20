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

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!isOpen || window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sidebar = document.querySelector<HTMLElement>('[data-mobile-sidebar]');
    document.body.style.overflow = 'hidden';

    const focusableSelector =
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const focusFirst = (): void => {
      const first = sidebar?.querySelector<HTMLElement>(focusableSelector);
      first?.focus();
    };
    window.requestAnimationFrame(focusFirst);

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab' || !sidebar) {
        return;
      }

      const focusable = Array.from(sidebar.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
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
