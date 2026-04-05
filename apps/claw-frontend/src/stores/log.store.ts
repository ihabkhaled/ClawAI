import { create } from 'zustand';

import { LOG_MAX_ENTRIES } from '@/constants';
import type { LogStoreActions, LogStoreState } from '@/types';

export const useLogStore = create<LogStoreState & LogStoreActions>()((set) => ({
  entries: [],
  maxEntries: LOG_MAX_ENTRIES,

  addEntry: (entry) =>
    set((state) => {
      const updated = [entry, ...state.entries];
      if (updated.length > state.maxEntries) {
        return { entries: updated.slice(0, state.maxEntries) };
      }
      return { entries: updated };
    }),

  clearEntries: () => set({ entries: [] }),
}));
