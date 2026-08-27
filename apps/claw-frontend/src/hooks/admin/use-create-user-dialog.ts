import { useState } from 'react';

import type { UseCreateUserDialogReturn } from '@/types';

/** Open/close state for the create-user dialog, kept out of the page TSX. */
export function useCreateUserDialog(): UseCreateUserDialogReturn {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
