import { describe, expect, it } from 'vitest';

import { buildCouncilPrompt, currentDateLine } from '../harness-council.utility';

describe('planning prompts state today', () => {
  it('names the UTC date', () => {
    expect(currentDateLine(new Date('2026-11-28T23:30:00Z'))).toContain('2026-11-28');
  });

  it('puts the date in every council and gap-check prompt', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(buildCouncilPrompt('SYSTEM', 'latest F1 winner?')).toContain(today);
    expect(buildCouncilPrompt('SYSTEM', 'x', 'earlier turn')).toContain(today);
  });
});
