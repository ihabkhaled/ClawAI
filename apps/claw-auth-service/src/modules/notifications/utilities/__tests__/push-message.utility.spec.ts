import { UserNotificationKind } from '@claw/shared-types';

import { UserLanguagePreference } from '../../../../generated/prisma';
import { buildPushMessage } from '../push-message.utility';

describe('buildPushMessage', () => {
  it('uses the English subject and preheader and keeps link and tag', () => {
    const message = buildPushMessage(
      UserLanguagePreference.EN,
      UserNotificationKind.THREAD_PUBLISHED,
      '/threads/a',
      'tag-1',
    );
    expect(message).toEqual({
      title: 'Your Thread is now public',
      body: 'Readers can open it now.',
      link: '/threads/a',
      lang: 'en',
      tag: 'tag-1',
    });
  });

  it('is localized and never carries a title placeholder, for every language and kind', () => {
    for (const language of Object.values(UserLanguagePreference)) {
      for (const kind of Object.values(UserNotificationKind)) {
        const message = buildPushMessage(language, kind, '/x', 't');
        expect(message.title.length).toBeGreaterThan(0);
        expect(message.body.length).toBeGreaterThan(0);
        expect(message.title).not.toContain('{value}');
        expect(message.body).not.toContain('{value}');
      }
    }
  });

  it('differs between languages', () => {
    const kind = UserNotificationKind.THREAD_FAILED;
    const en = buildPushMessage(UserLanguagePreference.EN, kind, '/x', 't');
    const fr = buildPushMessage(UserLanguagePreference.FR, kind, '/x', 't');
    expect(fr.title).not.toBe(en.title);
  });
});
