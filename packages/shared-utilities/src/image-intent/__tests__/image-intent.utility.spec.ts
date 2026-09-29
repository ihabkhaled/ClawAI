import { describe, expect, it } from 'vitest';

import {
  classifyImageIntent,
  detectImageGenerationSignals,
  hasAttachedImageMime,
} from '../image-intent.utility';
import { MultimodalImageIntent } from '../multimodal-image-intent.enum';

const { GENERATE, EDIT, ANALYZE, NONE } = MultimodalImageIntent;

describe('classifyImageIntent — with an attached image', () => {
  it.each([
    // pack §10/§81/§88
    ['remove the background', EDIT],
    ['make it blue', EDIT],
    ['add a hat', EDIT],
    ['Can you remove the background?', EDIT],
    ['please put sunglasses on him', EDIT],
    ['turn it into a watercolor painting', EDIT],
    ['change the sky to a sunset', EDIT],
    ['replace the car with a bicycle', EDIT],
    ['make the sky purple', EDIT],
    ['crop it to a square', EDIT],
    ['upscale this', EDIT],
    ['I want the background removed', EDIT],
    // the reference phrases chat-service kept as IMAGE_INTENT_PHRASES
    ['something similar', EDIT],
    ['generate an image like this', EDIT],
    ['recreate this in anime style', EDIT],
    ['draw a cat in the same style', EDIT],
    ['draw a cat', EDIT],
    ['edit this', EDIT],
    // non-English
    ['احذف الخلفية', EDIT],
    ['اجعلها زرقاء', EDIT],
    ['quita el fondo', EDIT],
    ['hazlo azul', EDIT],
    ['añade un sombrero', EDIT],
    ['enlève le fond', EDIT],
  ])('"%s" → %s', (message, expected) => {
    expect(classifyImageIntent(message, true)).toBe(expected);
  });

  it.each([
    ['what is this?', ANALYZE],
    ['What is in this picture', ANALYZE],
    ['describe this image', ANALYZE],
    ['how do I remove the background in Photoshop?', ANALYZE],
    ['is this photo real?', ANALYZE],
    ['read the text in this screenshot', ANALYZE],
    ['translate the sign', ANALYZE],
    ['extract the table', ANALYZE],
    ['summarize this', ANALYZE],
    ['I need to change my password, what does this error mean?', ANALYZE],
    ['copy the text from this image', ANALYZE],
    ['does this match the logo?', ANALYZE],
    ['convert this image to a PDF', ANALYZE],
    ['make a spreadsheet from this table', ANALYZE],
    ['hi', ANALYZE],
    ['', ANALYZE],
    ['make sure the numbers add up', ANALYZE],
    ['¿qué es esto?', ANALYZE],
    ['ما هذا؟', ANALYZE],
  ])('"%s" stays %s (false-positive guard)', (message, expected) => {
    expect(classifyImageIntent(message, true)).toBe(expected);
  });
});

describe('classifyImageIntent — no attached image', () => {
  it.each([
    ['draw a cat', GENERATE],
    ['generate an image of a sunset over the sea', GENERATE],
    ['ارسم لي قطة', GENERATE],
    ['a watercolor of a fox', GENERATE],
    ['describe how an image generator works', NONE],
    ['remove the background', NONE],
    ['make it blue', NONE],
    ['what is this?', NONE],
    ['', NONE],
  ])('"%s" → %s', (message, expected) => {
    expect(classifyImageIntent(message, false)).toBe(expected);
  });
});

describe('detectImageGenerationSignals', () => {
  it('explains which signal fired', () => {
    expect(detectImageGenerationSignals('Create a poster for my band')).toEqual({
      matched: true,
      exactKeyword: true,
      verbPlusImageWord: true,
      strongImageNoun: true,
      artStyle: false,
      reference: false,
    });
  });

  it('matches nothing in an ordinary coding question', () => {
    expect(detectImageGenerationSignals('fix this TypeScript error').matched).toBe(false);
  });
});

describe('hasAttachedImageMime', () => {
  it.each([
    [['image/png'], true],
    [['application/pdf', ' IMAGE/JPEG '], true],
    [['application/pdf'], false],
    [[], false],
    [undefined, false],
  ])('%j → %s', (mimes, expected) => {
    expect(hasAttachedImageMime(mimes)).toBe(expected);
  });
});
