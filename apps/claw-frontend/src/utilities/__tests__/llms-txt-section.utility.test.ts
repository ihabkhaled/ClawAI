import { describe, expect, it } from 'vitest';

import { ContentCategory } from '@/enums/content-category.enum';
import { LlmsTxtSection } from '@/enums/llms-txt-section.enum';
import { resolveLlmsTxtSection } from '@/utilities/llms-txt-section.utility';

describe('resolveLlmsTxtSection', () => {
  it('has an explicit case for every ContentCategory member', () => {
    for (const category of Object.values(ContentCategory)) {
      expect(() => resolveLlmsTxtSection(category)).not.toThrow();
    }
  });

  it('routes the home page to its own section, kept out of Product', () => {
    expect(resolveLlmsTxtSection(ContentCategory.HOME)).toBe(LlmsTxtSection.HOME);
  });

  it('routes comparison and legal pages to their existing dedicated sections', () => {
    expect(resolveLlmsTxtSection(ContentCategory.COMPARISON)).toBe(LlmsTxtSection.COMPARISONS);
    expect(resolveLlmsTxtSection(ContentCategory.LEGAL)).toBe(LlmsTxtSection.LEGAL);
  });

  // GUIDE (/learn) and WORKSPACE (/integrations) already shipped before this
  // resolver existed and were emitted under "Product" by the old deny-list.
  // The mechanism changed; the output for these two must not.
  it('keeps existing cluster categories in Product, preserving current output', () => {
    expect(resolveLlmsTxtSection(ContentCategory.GUIDE)).toBe(LlmsTxtSection.PRODUCT);
    expect(resolveLlmsTxtSection(ContentCategory.WORKSPACE)).toBe(LlmsTxtSection.PRODUCT);
    expect(resolveLlmsTxtSection(ContentCategory.FEATURES)).toBe(LlmsTxtSection.PRODUCT);
    expect(resolveLlmsTxtSection(ContentCategory.FAQ)).toBe(LlmsTxtSection.PRODUCT);
    expect(resolveLlmsTxtSection(ContentCategory.CONTACT)).toBe(LlmsTxtSection.PRODUCT);
  });
});
