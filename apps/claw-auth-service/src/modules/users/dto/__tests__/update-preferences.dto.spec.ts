import {
  UserAppearancePreference,
  UserLanguagePreference,
} from '../../../../generated/prisma';
import { updatePreferencesSchema } from '../update-preferences.dto';

describe('updatePreferencesSchema', () => {
  it('should validate when both fields are provided', () => {
    const result = updatePreferencesSchema.safeParse({
      languagePreference: UserLanguagePreference.EN,
      appearancePreference: UserAppearancePreference.DARK,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.languagePreference).toBe(UserLanguagePreference.EN);
      expect(result.data.appearancePreference).toBe(UserAppearancePreference.DARK);
    }
  });

  it('should validate when only languagePreference is provided', () => {
    const result = updatePreferencesSchema.safeParse({
      languagePreference: UserLanguagePreference.FR,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.languagePreference).toBe(UserLanguagePreference.FR);
      expect(result.data.appearancePreference).toBeUndefined();
    }
  });

  it('should validate when only appearancePreference is provided', () => {
    const result = updatePreferencesSchema.safeParse({
      appearancePreference: UserAppearancePreference.LIGHT,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.appearancePreference).toBe(UserAppearancePreference.LIGHT);
      expect(result.data.languagePreference).toBeUndefined();
    }
  });

  it('should reject an empty object (refine fails)', () => {
    const result = updatePreferencesSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('should reject an unsupported language value', () => {
    const result = updatePreferencesSchema.safeParse({
      languagePreference: 'KLINGON',
    });

    expect(result.success).toBe(false);
  });

  it('should reject an unsupported appearance value', () => {
    const result = updatePreferencesSchema.safeParse({
      appearancePreference: 'NEON',
    });

    expect(result.success).toBe(false);
  });

  it.each(
    Object.values(UserLanguagePreference),
  )('should accept language preference %s', (language) => {
    const result = updatePreferencesSchema.safeParse({
      languagePreference: language,
    });

    expect(result.success).toBe(true);
  });

  it.each(
    Object.values(UserAppearancePreference),
  )('should accept appearance preference %s', (appearance) => {
    const result = updatePreferencesSchema.safeParse({
      appearancePreference: appearance,
    });

    expect(result.success).toBe(true);
  });

  it('should strip unknown fields', () => {
    const result = updatePreferencesSchema.safeParse({
      languagePreference: UserLanguagePreference.EN,
      unknownField: 'value',
    });

    expect(result.success).toBe(true);
  });
});
