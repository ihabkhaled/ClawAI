import { describe, expect, it } from 'vitest';

import { isExplicitWebRequest } from '../explicit-web-request.utility';

describe('isExplicitWebRequest', () => {
  it.each([
    'please search internet for the latest Node release',
    'Search the web for pricing of Exa',
    'can you look it up online?',
    'google it',
    'do an internet search on solar panels',
    'search on google for cheap flights',
  ])('accepts "%s"', (message) => {
    expect(isExplicitWebRequest(message)).toBe(true);
  });

  it.each([
    'summarise the latest version of my essay',
    'explain closures',
    'search my notes for the meeting',
    'the web framework I use is Express',
    '',
  ])('rejects "%s"', (message) => {
    expect(isExplicitWebRequest(message)).toBe(false);
  });
});
