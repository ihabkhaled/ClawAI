'use client';

import { useCallback, useState } from 'react';

import type { UseOllamaToolTranscriptPanelReturn } from '@/types';

// Controller hook for the OllamaToolTranscriptPanel — a tiny open/close
// state machine for the "Used X web tools" collapsible under an assistant
// bubble. Kept in its own hook so the TSX component file stays pure
// component definitions per the no-inline-hooks rule.
export function useOllamaToolTranscriptPanel(): UseOllamaToolTranscriptPanelReturn {
  const [open, setOpen] = useState(false);
  const toggle = useCallback((): void => {
    setOpen((prev) => !prev);
  }, []);
  return { open, toggle };
}
