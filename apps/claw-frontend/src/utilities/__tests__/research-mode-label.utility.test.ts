import { describe, expect, it } from 'vitest';

import { ResearchMode } from '@/enums/research-mode.enum';
import { resolveResearchModeLabel } from '@/utilities/research-mode-label.utility';

const t = (key: string): string => `t(${key})`;

describe('resolveResearchModeLabel', () => {
  it('translates a known mode through its label key', () => {
    expect(resolveResearchModeLabel(ResearchMode.AUTO, t)).toBe('t(research.modes.auto)');
    expect(resolveResearchModeLabel(ResearchMode.NONE, t)).toBe('t(research.modes.none)');
  });

  it('falls back to the raw value for a mode with no label', () => {
    const raw = ['FUTURE', 'MODE'].join('_');
    const unknown = raw as ResearchMode;

    expect(resolveResearchModeLabel(unknown, t)).toBe('FUTURE_MODE');
  });
});
