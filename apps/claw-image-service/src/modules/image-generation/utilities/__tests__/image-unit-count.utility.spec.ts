import { countReturnedImages } from '../image-unit-count.utility';

describe('countReturnedImages', () => {
  it('counts a base64 image (gpt-image-1, Gemini)', () => {
    expect(countReturnedImages({ imageBase64: 'AAA', mimeType: 'image/png' })).toBe(1);
  });

  it('counts a URL image (dall-e-2 / dall-e-3)', () => {
    expect(
      countReturnedImages({ imageUrl: 'https://example.test/i.png', mimeType: 'image/png' }),
    ).toBe(1);
  });

  it('counts an answer with no image at all as zero, so nothing is charged for it', () => {
    expect(countReturnedImages({ mimeType: 'image/png' })).toBe(0);
    expect(countReturnedImages({ imageBase64: '', imageUrl: '', mimeType: 'image/png' })).toBe(0);
  });
});
