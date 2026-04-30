import { ImageDetectionManager } from '../image-detection.manager';

describe('ImageDetectionManager', () => {
  let manager: ImageDetectionManager;

  beforeEach(() => {
    manager = new ImageDetectionManager();
  });

  it('returns matched=false for plain text without image cues', () => {
    const result = manager.detect('What is the capital of France?');
    expect(result.matched).toBe(false);
    expect(result.exactKeyword).toBe(false);
    expect(result.verbPlusImageWord).toBe(false);
    expect(result.strongImageNoun).toBe(false);
    expect(result.artStyle).toBe(false);
    expect(result.reference).toBe(false);
  });

  it('detects an exact image keyword', () => {
    const result = manager.detect('Generate a beautiful sunset image-generation prompt');
    expect(result.matched).toBe(true);
  });

  it('detects verb + image-word combo', () => {
    const result = manager.detect('Please draw me a picture of a cat');
    expect(result.matched).toBe(true);
    expect(result.verbPlusImageWord).toBe(true);
  });

  it('detects strong image noun with supporting word', () => {
    const result = manager.detect('I need a logo design for my startup');
    expect(result.matched).toBe(true);
    expect(result.strongImageNoun).toBe(true);
  });

  it('does NOT match plain narrative text that happens to contain a single non-image noun', () => {
    const result = manager.detect('She walked through the door');
    expect(result.matched).toBe(false);
  });

  it('detects an art-style indicator alone', () => {
    const result = manager.detect('Show me a watercolor sunset.');
    expect(result.matched).toBe(true);
    expect(result.artStyle).toBe(true);
  });

  it('detects a reference phrase (recreate this)', () => {
    const result = manager.detect('Recreate this in cyberpunk style');
    expect(result.matched).toBe(true);
    expect(result.reference).toBe(true);
  });

  it('does NOT match a reference verb without a reference noun', () => {
    const result = manager.detect('Recreate the spreadsheet from scratch');
    // No "this" or "attached" in the same message → reference signal off.
    expect(result.reference).toBe(false);
  });

  it('is case-insensitive', () => {
    const result = manager.detect('GENERATE A POSTER FOR THE CONFERENCE');
    expect(result.matched).toBe(true);
  });
});
