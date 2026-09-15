'use client';

import { useCallback, useState } from 'react';

import type { UseModelFamilyCardReturn } from '@/types/hook.types';

/**
 * Open/closed state for one roster card's "all models" dialog.
 *
 * Lives in a hook rather than inline in the card because TSX files in this
 * codebase hold component definitions only (rules/03-frontend-rules.md).
 */
export function useModelFamilyCard(): UseModelFamilyCardReturn {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback((): void => setIsOpen(true), []);
  return { isOpen, open, setIsOpen };
}
