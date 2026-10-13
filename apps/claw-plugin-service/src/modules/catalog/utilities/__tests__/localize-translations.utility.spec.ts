import { Locale } from '@claw/shared-types';

import { type PartialTranslationMap } from '../../types/catalog.types';
import { localizeTranslations } from '../localize-translations.utility';

const translations = {
  en: { name: 'Weather', summary: 'English summary', description: 'English description' },
  fr: { name: 'Météo', summary: 'Résumé', description: 'Description' },
};

describe('localizeTranslations', () => {
  it('returns the requested locale when it is present', () => {
    expect(localizeTranslations(translations, Locale.FR)).toEqual(translations.fr);
  });

  it('falls back to English when the locale is missing', () => {
    expect(localizeTranslations(translations, Locale.JA)).toEqual(translations.en);
  });

  it('falls back to English for each missing field on its own', () => {
    const partial: PartialTranslationMap = {
      en: translations.en,
      de: { name: 'Wetter' },
    };
    expect(localizeTranslations(partial, Locale.DE)).toEqual({
      name: 'Wetter',
      summary: 'English summary',
      description: 'English description',
    });
  });

  it('does not read inherited keys', () => {
    const result = localizeTranslations(translations, 'constructor' as Locale);
    expect(result).toEqual(translations.en);
  });
});
