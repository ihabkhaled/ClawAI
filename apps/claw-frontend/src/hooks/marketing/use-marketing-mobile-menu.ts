'use client';

import { useCallback, useState } from 'react';

import type { UseMarketingMobileMenuReturn } from '@/types';

export function useMarketingMobileMenu(): UseMarketingMobileMenuReturn {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback((): void => {
    setIsOpen(false);
  }, []);

  return { isOpen, setIsOpen, close };
}
