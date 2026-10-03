import {
  FILE_FOLLOW_UP_PREFIXES,
  IMAGE_FOLLOW_UP_PREFIXES,
} from '../../constants/follow-up-detection.constants';
import { isFollowUpPhrase } from '../follow-up-phrase.utility';

describe('isFollowUpPhrase', () => {
  it.each(['another', 'another one please', 'one more', 'again', 'do another'])(
    '"%s" repeats the last generation',
    (text) => {
      expect(isFollowUpPhrase(text, IMAGE_FOLLOW_UP_PREFIXES)).toBe(true);
      expect(isFollowUpPhrase(text, FILE_FOLLOW_UP_PREFIXES)).toBe(true);
    },
  );

  it.each([
    'another thing: say also we create files and videos',
    'another point is that users can create images',
    'another question about pricing',
    'another idea for the post',
  ])('"%s" opens a new thought and is not a repeat', (text) => {
    expect(isFollowUpPhrase(text, IMAGE_FOLLOW_UP_PREFIXES)).toBe(false);
    expect(isFollowUpPhrase(text, FILE_FOLLOW_UP_PREFIXES)).toBe(false);
  });

  it('a long message is never a follow-up', () => {
    expect(isFollowUpPhrase(`another ${'x'.repeat(120)}`, IMAGE_FOLLOW_UP_PREFIXES)).toBe(false);
  });
});
