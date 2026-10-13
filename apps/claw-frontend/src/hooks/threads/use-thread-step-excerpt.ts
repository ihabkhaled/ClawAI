import { useState } from 'react';

/** Open/closed state of one step excerpt. Closed by default so a long run stays scannable. */
export function useThreadStepExcerpt(): { isOpen: boolean; toggle: () => void } {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, toggle: () => setIsOpen((current) => !current) };
}
