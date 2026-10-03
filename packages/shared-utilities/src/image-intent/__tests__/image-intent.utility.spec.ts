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

describe('classifyImageIntent — supplementary context and writing tasks are not image requests', () => {
  it.each([
    // The exact pasted text that generated an image for a LinkedIn post.
    'Say also talk to models with audio/video, create files... add more 5 6 features, 1-2 words each',
    'Also: talk to models with audio and video, create files, add 5 more features, 1-2 words each',
    'Additional context: the app can create files, talk to voice models and show a diagram view',
    'More context: we support audio, video, files and a logo gallery, keep each point to 2 words',
    'Say also we have a new logo and icon set, add 4 more features, 1-2 words each',
    'Add more points about our poster and banner designs, short ones',
    'btw the post should mention our graphic templates and cover pages',
    'Write a LinkedIn post about our new logo and banner designs',
    'Draft a LinkedIn post announcing our poster launch',
    'Write a caption for this photo',
    'Summarize the article about the new avatar feature',
    'Write a blog post about how designers draw a conclusion from user research',
  ])('"%s" → NONE', (message) => {
    expect(classifyImageIntent(message, false)).toBe(NONE);
    expect(detectImageGenerationSignals(message).matched).toBe(false);
  });

  it.each([
    'Also create an image for the post',
    'Say also make me a logo for it',
    'Write a LinkedIn post and draw a cat to go with it',
    'Draft the post, then generate a picture of a rocket',
  ])('"%s" → GENERATE (an explicit image request still counts)', (message) => {
    expect(classifyImageIntent(message, false)).toBe(GENERATE);
  });

  it('a caption request with an image attached stays ANALYZE, not EDIT', () => {
    expect(classifyImageIntent('Write a caption for this photo', true)).toBe(ANALYZE);
  });
});

describe('detectImageGenerationSignals — whole words only', () => {
  it.each([
    'We will discover new markets and recover costs',
    'Economic forecasts for the next quarter',
    'Please withdraw a payment from the account',
    'An obscene amount of silicon was shipped',
    'Make the report geographic in scope',
  ])('"%s" matches nothing', (message) => {
    expect(detectImageGenerationSignals(message).matched).toBe(false);
  });

  it.each([
    ['draw a cat', true],
    ['Create a poster for my band', true],
    ['generate logos for three brands', true],
    ['please sketch me a house', true],
    ['render ', false],
  ])('"%s" → %s', (message, expected) => {
    expect(detectImageGenerationSignals(message).matched).toBe(expected);
  });

  it('a verb far from every image word is not a request', () => {
    expect(
      detectImageGenerationSignals(
        'create a spreadsheet of last quarter results for every region and also review the scene notes',
      ).verbPlusImageWord,
    ).toBe(false);
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
