import { useState } from 'react';

import { useContextReceipt } from '@/hooks/chat/use-context-receipt';
import type { ContextReceipt } from '@/types';

export function useThreadContextInspector(messageId: string): {
  isOpen: boolean;
  openInspector: () => void;
  setOpen: (open: boolean) => void;
  receipt: ContextReceipt | null;
  isLoading: boolean;
  isError: boolean;
} {
  const [isOpen, setIsOpen] = useState(false);
  const { receipt, isLoading, isError } = useContextReceipt(messageId, isOpen);

  const openInspector = (): void => {
    setIsOpen(true);
  };

  return {
    isOpen,
    openInspector,
    setOpen: setIsOpen,
    receipt,
    isLoading,
    isError,
  };
}
