import { describe, expect, it } from 'vitest';

import { extractSalientTerms, searchTermsFor } from '../salient-terms.utility';

describe('salient terms in any language (owner report 2026-11-28)', () => {
  it('searches other chats for the Arabic words that matter, as they are stored', () => {
    expect(searchTermsFor(extractSalientTerms('فاكر اسم قطتي إيه؟'))).toEqual(['قطتي', 'اسم']);
    expect(searchTermsFor(extractSalientTerms('فاكر كلمة السر بتاعة الحفلة؟'))).toContain('حفلة');
  });

  it('keeps English behaviour and identifiers first', () => {
    expect(searchTermsFor(extractSalientTerms('What is my dog called?'))).toEqual(['called']);
    expect(extractSalientTerms('Continue the MERIDIAN-88 project').identifiers).toEqual([
      'MERIDIAN-88',
    ]);
  });

  it('searches Chinese by character pairs and Russian by words', () => {
    expect(searchTermsFor(extractSalientTerms('我的秘密'))).toEqual(['我的', '的秘', '秘密']);
    expect(searchTermsFor(extractSalientTerms('мой секрет'))).toEqual(['секрет', 'мой']);
  });
});
