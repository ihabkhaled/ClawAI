import { useState } from 'react';

import { THREAD_SUGGESTION_CLAMP_CHARS } from '@/constants/thread-change-requests.constants';
import type { ThreadSuggestionClamp } from '@/types/thread-publication.types';
import { clampSuggestionText } from '@/utilities/thread-suggestion-clamp.utility';

/** A long suggestion starts clamped; the toggle shows all of it or clamps it again. */
export function useThreadSuggestionClamp(text: string): ThreadSuggestionClamp {
  const [expanded, setExpanded] = useState(false);
  const clamped = clampSuggestionText(text, THREAD_SUGGESTION_CLAMP_CHARS, expanded);
  return {
    visibleText: clamped.text,
    isLong: clamped.isLong,
    expanded,
    toggle: () => setExpanded((value) => !value),
  };
}
