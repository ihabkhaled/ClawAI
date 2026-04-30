/**
 * Keyword arrays used by ImageDetectionManager to classify a user message
 * as an image-generation request. Lifted out of routing.manager.ts where
 * they were inline inside `detectImageRequest`, contributing to that
 * method's 123-line / complexity-22 lint warnings.
 */

export const IMAGE_VERBS: readonly string[] = [
  'generate',
  'create',
  'draw',
  'make',
  'paint',
  'render',
  'design',
  'produce',
  'recreate',
  'reproduce',
  'remake',
  'redo',
];

export const IMAGE_WORDS: readonly string[] = [
  'image',
  'picture',
  'photo',
  'portrait',
  'illustration',
  'sketch',
  'artwork',
  'graphic',
  'poster',
  'banner',
  'icon',
  'logo',
  'wallpaper',
  'avatar',
  'cartoon',
  'anime',
  'manga',
  'comic',
  'sticker',
  'mascot',
  'character',
  'scene',
  'landscape',
  'cityscape',
  'infographic',
  'diagram',
  'wireframe',
  'mockup',
  'thumbnail',
  'cover',
  'texture',
  'pattern',
  'meme',
  'gif',
];

export const STRONG_IMAGE_NOUNS: readonly string[] = [
  'illustration',
  'portrait',
  'poster',
  'logo',
  'banner',
  'sticker',
  'mascot',
  'wallpaper',
  'avatar',
  'icon',
  'infographic',
  'wireframe',
  'mockup',
  'thumbnail',
  'cartoon',
  'comic strip',
  'manga',
  'anime',
];

export const ART_STYLE_INDICATORS: readonly string[] = [
  'photorealistic',
  'watercolor',
  'oil painting',
  'impressionist',
  'cyberpunk',
  'pixel art',
  'abstract art',
  'digital art',
  'concept art',
  'fan art',
  'line art',
  'pop art',
  'vintage poster',
  'retro style',
  'minimalist design',
  'botanical illustration',
  'still life',
  'floor plan',
  'anime style',
  'comic strip',
  'sticker design',
];

export const IMAGE_REFERENCE_VERBS: readonly string[] = ['recreate', 'reproduce', 'remake'];

export const IMAGE_REFERENCE_NOUNS: readonly string[] = ['this', 'attached'];

export const IMAGE_DECISION_CONFIDENCE = 0.95;
