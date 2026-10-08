import { NOTIFICATION_TITLE_MAX_LENGTH } from '../../constants/thread-notification.constants';
import { notificationTitle, publicLink, reviewLink } from '../thread-notification.utility';

describe('thread notification links', () => {
  it('points the owner at the review page', () => {
    expect(reviewLink('pub_1')).toBe('/threads/review/pub_1');
  });

  it('points readers at the public page and encodes the slug', () => {
    expect(publicLink('a-b')).toBe('/threads/a-b');
    expect(publicLink('a/b?c')).toBe('/threads/a%2Fb%3Fc');
  });
});

describe('notificationTitle', () => {
  it('collapses whitespace and trims', () => {
    expect(notificationTitle('  Hello \n  world  ')).toBe('Hello world');
  });

  it('cuts a long title to the limit with an ellipsis', () => {
    const cut = notificationTitle('x'.repeat(500));
    expect(cut).toHaveLength(NOTIFICATION_TITLE_MAX_LENGTH);
    expect(cut.endsWith('…')).toBe(true);
  });

  it('keeps an empty title empty', () => {
    expect(notificationTitle('   ')).toBe('');
  });
});
