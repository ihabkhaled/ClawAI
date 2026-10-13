import { describe, expect, it } from 'vitest';

import {
  THREAD_STEP_OUTCOME_KEYS,
  THREAD_STEP_OUTCOME_TONES,
} from '@/constants/thread-generation-progress.constants';

// Axe measured the old tokens on a white card in the light theme: warning 2.13:1, info 3.63:1,
// success 3.64:1, all under the 4.5:1 floor. The tones now pair a dark shade for light mode with
// the bright token for dark mode.
describe('THREAD_STEP_OUTCOME_TONES', () => {
  const lowContrastOnWhite = /(^|\s)text-(info|success|warning|destructive)(\s|$)/u;

  it('has a tone for every outcome the labels cover', () => {
    expect(Object.keys(THREAD_STEP_OUTCOME_TONES).sort()).toEqual(
      Object.keys(THREAD_STEP_OUTCOME_KEYS).sort(),
    );
  });

  it('never uses a bare status token as light-theme text', () => {
    for (const tone of Object.values(THREAD_STEP_OUTCOME_TONES)) {
      expect(tone).not.toMatch(lowContrastOnWhite);
    }
  });

  it('keeps the bright token for dark mode on every coloured tone', () => {
    for (const tone of Object.values(THREAD_STEP_OUTCOME_TONES)) {
      if (tone !== 'text-muted-foreground') {
        expect(tone).toMatch(/dark:text-(info|success|warning|destructive)/u);
      }
    }
  });
});
