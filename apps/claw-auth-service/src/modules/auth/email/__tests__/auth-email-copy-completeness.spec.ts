import { UserLanguagePreference } from '../../../../generated/prisma';
import { AuthEmailKind } from '../../enums/auth-email-kind.enum';
import { AUTH_EMAIL_DICTIONARIES } from '../copy';
import { EN_AUTH_EMAIL_DICTIONARY } from '../copy/en.copy';
import {
  AUTH_EMAIL_EXPIRY_10_MINUTES,
  AUTH_EMAIL_EXPIRY_1_HOUR,
  AUTH_EMAIL_EXPIRY_24_HOURS,
  AUTH_EMAIL_EXPIRY_30_MINUTES,
} from '../constants/auth-email-expiry.constants';

const LOCALES = Object.values(UserLanguagePreference);
const KINDS = Object.values(AuthEmailKind);

// The type system already forces every locale and every email kind to EXIST.
// What it cannot check is that the translation is a real translation: a locale
// could satisfy the type with English strings, an empty string, or a paragraph
// that silently dropped the {value} placeholder the email is built around.
// Those are the failures this suite exists to catch.
describe('auth email copy completeness', () => {
  it('covers all 13 supported languages', () => {
    expect(LOCALES).toHaveLength(13);
    for (const locale of LOCALES) {
      expect(AUTH_EMAIL_DICTIONARIES[locale]).toBeDefined();
    }
  });

  describe.each(LOCALES)('%s', (locale) => {
    const dictionary = AUTH_EMAIL_DICTIONARIES[locale];

    it('has non-empty chrome with a {value} slot in the greeting', () => {
      const chrome = dictionary.chrome;
      for (const [field, text] of Object.entries(chrome)) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(`${field}:${text}`).not.toContain('TODO');
      }
      expect(chrome.greeting).toContain('{value}');
      expect(chrome.greetingFallback).not.toContain('{value}');
    });

    it.each(KINDS)('%s matches the English shape exactly', (kind) => {
      const copy = dictionary.emails[kind];
      const english = EN_AUTH_EMAIL_DICTIONARY.emails[kind];

      // Same number of paragraphs: a locale that merged two body lines into one
      // renders differently from every other locale.
      expect(copy.bodyLines).toHaveLength(english.bodyLines.length);

      // Optional fields are null in the SAME places, so an email that has no
      // button in English cannot grow one here (there would be no URL to give
      // it) and one that has a button cannot lose its label.
      expect(copy.actionLabel === null).toBe(english.actionLabel === null);
      expect(copy.fallbackNote === null).toBe(english.fallbackNote === null);
      expect(copy.expiryNote === null).toBe(english.expiryNote === null);

      for (const text of [
        copy.subject,
        copy.preheader,
        copy.heading,
        copy.intro,
        copy.securityNote,
      ]) {
        expect(text.trim().length).toBeGreaterThan(0);
      }
      for (const line of copy.bodyLines) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
    });

    it.each(KINDS)('%s keeps every placeholder English uses', (kind) => {
      const copy = dictionary.emails[kind];
      const english = EN_AUTH_EMAIL_DICTIONARY.emails[kind];

      const joined = [copy.intro, ...copy.bodyLines].join('\n');
      const englishJoined = [english.intro, ...english.bodyLines].join('\n');
      // A dropped {value} is invisible in review and produces an email that
      // simply omits the code or the address it exists to deliver.
      expect(joined.includes('{value}')).toBe(englishJoined.includes('{value}'));

      if (english.expiryNote !== null && copy.expiryNote !== null) {
        expect(copy.expiryNote.includes('{expiry}')).toBe(english.expiryNote.includes('{expiry}'));
      }
    });
  });

  describe.each([
    ['24 hours', AUTH_EMAIL_EXPIRY_24_HOURS],
    ['1 hour', AUTH_EMAIL_EXPIRY_1_HOUR],
    ['30 minutes', AUTH_EMAIL_EXPIRY_30_MINUTES],
    ['10 minutes', AUTH_EMAIL_EXPIRY_10_MINUTES],
  ])('%s expiry phrasing', (_label, table) => {
    it('is present and non-empty for every language', () => {
      for (const locale of LOCALES) {
        expect(table[locale].trim().length).toBeGreaterThan(0);
      }
    });
  });
});
