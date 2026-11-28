import type { PluralForms, RawPluralForms } from '@/types/plugin-qa-fixes-i18n.types';

/**
 * All six plural keys from what a language wrote. A language writes only the forms it distinguishes
 * (English: one/other; Arabic: all six); the rest repeat its general `other` form, so every locale
 * stays key-for-key identical for the dictionary parity test.
 */
export function fillPluralForms(forms: RawPluralForms): PluralForms {
  return {
    zero: forms.zero ?? forms.other,
    one: forms.one ?? forms.other,
    two: forms.two ?? forms.other,
    few: forms.few ?? forms.other,
    many: forms.many ?? forms.other,
    other: forms.other,
  };
}
