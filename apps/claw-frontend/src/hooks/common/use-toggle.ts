import { useCallback, useState } from 'react';

import type { UseToggleReturn } from '@/types';

export const useToggle = (initialState = false): UseToggleReturn => {
  const [isOpen, setIsOpen] = useState(initialState);
  const toggle = useCallback((): void => setIsOpen((prev) => !prev), []);
  const open = useCallback((): void => setIsOpen(true), []);
  const close = useCallback((): void => setIsOpen(false), []);
  return { isOpen, toggle, open, close };
};
