import { UserLanguagePreference } from '../../../../generated/prisma';
import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import { renderAuthEmail } from '../utilities/auth-email-render.utility';

const LOCALES = Object.values(UserLanguagePreference);
const KINDS = [
  AuthEmailKind.THREAD_READY_FOR_REVIEW,
  AuthEmailKind.THREAD_PUBLISHED,
  AuthEmailKind.THREAD_FAILED,
];
const ACTION_URL = 'https://claw.local/threads/review/pub_1';

function render(kind: AuthEmailKind, locale: UserLanguagePreference, value: string | null) {
  return renderAuthEmail({
    kind,
    locale,
    recipientName: 'Ada',
    value,
    expiry: null,
    actionUrl: ACTION_URL,
    siteUrl: 'https://claw.local',
  });
}

describe.each(LOCALES)('Threads notification emails in %s', (locale) => {
  it.each(KINDS)('%s renders with the link and no leftover placeholder', (kind) => {
    const message = render(kind, locale, 'My Thread');
    expect(message.subject.trim().length).toBeGreaterThan(0);
    expect(message.text).toContain(ACTION_URL);
    expect(message.html).toContain(ACTION_URL);
    expect(message.text).not.toContain('{value}');
    expect(message.html).not.toContain('{value}');
  });

  it('puts the title of a published Thread in the message', () => {
    const message = render(AuthEmailKind.THREAD_PUBLISHED, locale, 'My Thread');
    expect(message.text).toContain('My Thread');
  });

  it('escapes a hostile title so it cannot inject markup', () => {
    const message = render(AuthEmailKind.THREAD_PUBLISHED, locale, '<script>alert(1)</script>');
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
  });
});
