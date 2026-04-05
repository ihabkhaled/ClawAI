import { create } from 'zustand';

import type { SidebarStoreActions, SidebarStoreState } from '@/types';

export const useSidebarStore = create<SidebarStoreState & SidebarStoreActions>((set) => ({
  isOpen: false,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
