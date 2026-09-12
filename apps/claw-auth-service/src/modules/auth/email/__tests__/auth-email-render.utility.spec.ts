import { UserLanguagePreference } from '../../../../generated/prisma';
import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import { AUTH_EMAIL_DICTIONARIES } from '../copy';
import { renderAuthEmail } from '../utilities/auth-email-render.utility';
import type { AuthEmailRenderInput } from '../types/auth-email-render.type';

function input(overrides: Partial<AuthEmailRenderInput> = {}): AuthEmailRenderInput {
  return {
    kind: AuthEmailKind.VERIFICATION,
    locale: UserLanguagePreference.EN,
    recipientName: 'Ada',
    value: null,
    expiry: '24 hours',
    actionUrl: 'https://claw-ai.co/verify-email?token=abc',
    siteUrl: 'https://claw-ai.co',
    ...overrides,
  };
}

describe('renderAuthEmail', () => {
  it('uses the subject from the requested language, not English', () => {
    const english = renderAuthEmail(input());
    const french = renderAuthEmail(input({ locale: UserLanguagePreference.FR }));

    expect(english.subject).toBe(
      AUTH_EMAIL_DICTIONARIES[UserLanguagePreference.EN].emails[AuthEmailKind.VERIFICATION].subject,
    );
    expect(french.subject).toBe(
      AUTH_EMAIL_DICTIONARIES[UserLanguagePreference.FR].emails[AuthEmailKind.VERIFICATION].subject,
    );
    expect(french.subject).not.toBe(english.subject);
  });

  it('renders the recipient name into the greeting, and falls back without one', () => {
    expect(renderAuthEmail(input()).text).toContain('Ada');
    const anonymous = renderAuthEmail(input({ recipientName: null }));
    expect(anonymous.text).toContain('Hello,');
    expect(anonymous.text).not.toContain('{value}');
  });

  it('treats a blank name as no name rather than greeting an empty space', () => {
    expect(renderAuthEmail(input({ recipientName: '   ' })).text).toContain('Hello,');
  });

  it('leaves no unsubstituted placeholder in either body', () => {
    for (const locale of Object.values(UserLanguagePreference)) {
      for (const kind of Object.values(AuthEmailKind)) {
        const rendered = renderAuthEmail(
          input({ kind, locale, value: 'n**w@example.com', expiry: 'soon' }),
        );
        expect(rendered.text).not.toContain('{value}');
        expect(rendered.text).not.toContain('{expiry}');
        expect(rendered.html).not.toContain('{value}');
        expect(rendered.html).not.toContain('{expiry}');
      }
    }
  });

  // The adapter used to interpolate a user-controlled masked address straight
  // into an HTML string literal. Escaping every value in one place is what
  // makes that class of bug unreachable rather than fixed once.
  it('escapes HTML in an interpolated value instead of emitting markup', () => {
    const rendered = renderAuthEmail(
      input({
        kind: AuthEmailKind.EMAIL_CHANGE_OTP,
        value: '<img src=x onerror=alert(1)>@example.com',
        actionUrl: null,
      }),
    );
    expect(rendered.html).not.toContain('<img src=x');
    expect(rendered.html).toContain('&lt;img src=x');
  });

  it('escapes HTML in a recipient name', () => {
    const rendered = renderAuthEmail(input({ recipientName: '<b>Ada</b>' }));
    expect(rendered.html).not.toContain('<b>Ada</b>');
    expect(rendered.html).toContain('&lt;b&gt;Ada&lt;/b&gt;');
  });

  it('marks Arabic and Persian right-to-left, and everything else left-to-right', () => {
    expect(renderAuthEmail(input({ locale: UserLanguagePreference.AR })).html).toContain(
      'dir="rtl"',
    );
    expect(renderAuthEmail(input({ locale: UserLanguagePreference.FA })).html).toContain(
      'dir="rtl"',
    );
    const german = renderAuthEmail(input({ locale: UserLanguagePreference.DE })).html;
    expect(german).toContain('<html lang="de" dir="ltr"');
  });

  it('keeps the literal URL left-to-right even inside a right-to-left email', () => {
    const arabic = renderAuthEmail(input({ locale: UserLanguagePreference.AR })).html;
    expect(arabic).toContain('<p dir="ltr"');
  });

  it('includes the action URL in both the button and the copyable fallback', () => {
    const rendered = renderAuthEmail(input());
    const occurrences = rendered.html.split('https://claw-ai.co/verify-email?token=abc').length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
    expect(rendered.text).toContain('https://claw-ai.co/verify-email?token=abc');
  });

  it('omits the button entirely for an email with no action', () => {
    const rendered = renderAuthEmail(
      input({ kind: AuthEmailKind.EMAIL_CHANGE_COMPLETED, actionUrl: null, expiry: null }),
    );
    expect(rendered.html).not.toContain('<table role="presentation" cellpadding="0"');
  });

  it('carries a preheader that is hidden in the body', () => {
    const rendered = renderAuthEmail(input());
    const preheader =
      AUTH_EMAIL_DICTIONARIES[UserLanguagePreference.EN].emails[AuthEmailKind.VERIFICATION]
        .preheader;
    expect(rendered.html).toContain(preheader);
    expect(rendered.html).toContain('display:none;max-height:0');
  });

  it('produces a complete HTML document for every language and email', () => {
    for (const locale of Object.values(UserLanguagePreference)) {
      for (const kind of Object.values(AuthEmailKind)) {
        const rendered = renderAuthEmail(input({ kind, locale, value: 'x', expiry: 'y' }));
        expect(rendered.html.startsWith('<!doctype html>')).toBe(true);
        expect(rendered.html.endsWith('</html>')).toBe(true);
        expect(rendered.text.length).toBeGreaterThan(80);
      }
    }
  });
});
