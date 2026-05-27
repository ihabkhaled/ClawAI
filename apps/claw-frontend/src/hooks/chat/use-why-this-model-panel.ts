import { useState } from 'react';

export function useWhyThisModelPanel(): {
  isExpanded: boolean;
  toggleExpanded: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;
} {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleExpanded = (): void => {
    setIsExpanded((prev) => !prev);
  };
  const openDrawer = (): void => {
    setIsDrawerOpen(true);
  };

  return {
    isExpanded,
    toggleExpanded,
    isDrawerOpen,
    openDrawer,
    setDrawerOpen: setIsDrawerOpen,
  };
}
