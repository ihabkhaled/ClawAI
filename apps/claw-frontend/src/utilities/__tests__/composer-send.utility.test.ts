import { describe, expect, it } from 'vitest';

import { hasSendableInput } from '@/utilities/composer-send.utility';

describe('hasSendableInput', () => {
  it('sends typed text with no files', () => {
    expect(hasSendableInput('hello', 0)).toBe(true);
  });

  it('sends files with no text — "I can send attachments WITHOUT text"', () => {
    expect(hasSendableInput('', 1)).toBe(true);
    expect(hasSendableInput('   \n', 2)).toBe(true);
  });

  it('refuses nothing at all', () => {
    expect(hasSendableInput('', 0)).toBe(false);
    expect(hasSendableInput('  \t', 0)).toBe(false);
  });

  it("honours a lab's minimum only when no file is attached", () => {
    expect(hasSendableInput('short', 0, 10)).toBe(false);
    expect(hasSendableInput('long enough text', 0, 10)).toBe(true);
    expect(hasSendableInput('', 1, 10)).toBe(true);
  });
});
