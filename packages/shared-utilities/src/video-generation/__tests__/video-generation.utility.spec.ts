import {
  classifyVideoIntent,
  inferVideoCapabilityProvider,
  isVideoOutputModel,
  readVideoRequestOptions,
  resolveVideoCapabilityProvider,
} from '../video-generation.utility';

describe('resolveVideoCapabilityProvider', () => {
  it.each([
    ['GEMINI', 'models/veo-3.1-generate-preview', 'VIDEO_GEMINI'],
    ['gemini', 'models/veo-3.1-fast-generate-preview', 'VIDEO_GEMINI'],
    ['GEMINI', 'veo-3.1-lite-generate-preview', 'VIDEO_GEMINI'],
    ['GROK', 'grok-imagine-video', 'VIDEO_GROK'],
    ['GROK', 'grok-imagine-video-1.5', 'VIDEO_GROK'],
  ])('routes %s %s to %s', (connector, model, provider) => {
    expect(resolveVideoCapabilityProvider(connector, model)).toBe(provider);
    expect(isVideoOutputModel(connector, model)).toBe(true);
  });

  it.each([
    ['GEMINI', 'models/gemini-2.5-flash'],
    ['GEMINI', 'models/gemini-3-pro-image'],
    ['GROK', 'grok-imagine-image'],
    ['GROK', 'grok-4'],
    ['OPENAI', 'sora-2'],
    ['OPENAI', 'sora-2-pro'],
  ])('leaves %s %s alone: a chat model, an image model, or a shut-down API', (connector, model) => {
    expect(resolveVideoCapabilityProvider(connector, model)).toBeUndefined();
  });

  it('infers the provider from a bare model id', () => {
    expect(inferVideoCapabilityProvider('grok-imagine-video')).toBe('VIDEO_GROK');
    expect(inferVideoCapabilityProvider('gpt-5')).toBeUndefined();
  });
});

describe('classifyVideoIntent', () => {
  it.each([
    'can you generate video about claw ai ?',
    'Generate a video of a lighthouse at dusk',
    'make me a short video about our product',
    'please create a 6 second cinematic clip of rain',
    'produce an animation of a rocket',
    'text to video: a cat surfing',
    'imagine a video of the ocean',
  ])('asks for a video: %j', (message) => {
    expect(classifyVideoIntent(message)).toBe(true);
  });

  it.each([
    'how do I make a video call in Zoom',
    'summarise this video',
    'what is video generation',
    'generate an image of a cat',
    'write a script for a video',
    'video editing software recommendations',
    'hello',
  ])('does not ask for a video: %j', (message) => {
    expect(classifyVideoIntent(message)).toBe(false);
  });
});

describe('classifyVideoIntent with an attached image', () => {
  it.each([
    'animate this image',
    'Animate this',
    'animate it slowly, waves moving',
    'please animate the photo',
    'bring this picture to life',
    'turn my photo into a video',
    'image to video: slow zoom in',
    'make a video from this',
  ])('asks for image-to-video: %j', (message) => {
    expect(classifyVideoIntent(message, true)).toBe(true);
  });

  it('does not treat "animate this image" as a video request when nothing is attached', () => {
    expect(classifyVideoIntent('animate this image')).toBe(false);
    expect(classifyVideoIntent('animate this image', false)).toBe(false);
  });

  it.each([
    'what is in this image',
    'describe this photo',
    'make this image brighter',
    'explain the animation in this picture',
  ])('leaves a plain question or edit alone: %j', (message) => {
    expect(classifyVideoIntent(message, true)).toBe(false);
  });
});

describe('readVideoRequestOptions', () => {
  it('defaults to a 4 second landscape clip', () => {
    expect(readVideoRequestOptions('make a video of the sea')).toEqual({
      durationSeconds: 4,
      aspectRatio: '16:9',
    });
  });

  it('reads a length and clamps it to what providers accept', () => {
    expect(readVideoRequestOptions('make a 6 second video').durationSeconds).toBe(6);
    expect(readVideoRequestOptions('make a 30 second video').durationSeconds).toBe(8);
    expect(readVideoRequestOptions('make a 1s video').durationSeconds).toBe(4);
  });

  it('reads a vertical request', () => {
    expect(readVideoRequestOptions('a vertical video for tiktok').aspectRatio).toBe('9:16');
    expect(readVideoRequestOptions('a video in 9:16').aspectRatio).toBe('9:16');
  });
});
