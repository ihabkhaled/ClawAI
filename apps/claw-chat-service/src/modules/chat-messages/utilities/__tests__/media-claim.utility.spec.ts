import { describe, expect, it } from 'vitest';

import { claimsMedia, stripMediaClaims } from '../media-claim.utility';

describe('claimsMedia', () => {
  it.each([
    'Image generated: a red apple',
    '**Video created** for you',
    'I have created the image for you.',
    "Here's the song I made.",
    'Done! I generated a picture of an apple.',
  ])('flags %s', (text) => {
    expect(claimsMedia(text)).toBe(true);
  });

  it.each([
    'An apple is a fruit.',
    'You can generate an image with the tool.',
    'The video was made by Pixar in 1995.',
    'I can create images if you ask.',
  ])('leaves %s alone', (text) => {
    expect(claimsMedia(text)).toBe(false);
  });
});

describe('stripMediaClaims', () => {
  it('removes the claiming sentences and keeps the rest', () => {
    expect(
      stripMediaClaims('Image generated: a red apple\nEnjoy the apple. I have created the image!'),
    ).toBe('Enjoy the apple.');
  });
});
