import {
  isSupportedTtsVoice,
  isValidCountryCode,
  SUPPORTED_DISPLAY_CURRENCIES,
  TTS_VOICE_MAX_LENGTH,
} from '@claw/shared-constants';
import { z } from 'zod';
import {
  CurrencyPreferenceMode,
  UserAppearancePreference,
  UserLanguagePreference,
} from '../../../generated/prisma';

// Display currency lives HERE, in ordinary preferences, and not in the
// sensitive profile mutation that demands the current password. Changing which
// symbol a price is printed in is presentation state — it cannot move money,
// change an entitlement or reveal anything — and making someone re-enter a
// password for it would be security theatre that teaches them to type their
// password more often.
const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  // Bounded before it is looked up. An unbounded string reaching an allowlist
  // check is still an unbounded string arriving from the internet.
  .length(3)
  .refine((code) => Object.hasOwn(SUPPORTED_DISPLAY_CURRENCIES, code), {
    message: 'Unsupported display currency',
  });

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(2)
  .refine((code) => isValidCountryCode(code), { message: 'Invalid ISO country code' });

// A read-aloud voice: bounded, then checked against the one shared catalog.
// Case is significant — provider APIs take the exact name ("Kore", "alloy").
const ttsVoiceSchema = z
  .string()
  .trim()
  .min(1)
  .max(TTS_VOICE_MAX_LENGTH)
  .refine((voice) => isSupportedTtsVoice(voice), { message: 'Unsupported voice' });

export const updatePreferencesSchema = z
  .object({
    languagePreference: z.nativeEnum(UserLanguagePreference).optional(),
    appearancePreference: z.nativeEnum(UserAppearancePreference).optional(),
    currencyPreferenceMode: z.nativeEnum(CurrencyPreferenceMode).optional(),
    // Explicitly nullable: null CLEARS the stored value, which is different
    // from omitting the field and leaving it as it was.
    preferredCountryCode: countryCodeSchema.nullable().optional(),
    preferredCurrencyCode: currencyCodeSchema.nullable().optional(),
    // null = back to each provider's default voice.
    ttsVoice: ttsVoiceSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.languagePreference !== undefined ||
      data.appearancePreference !== undefined ||
      data.currencyPreferenceMode !== undefined ||
      data.preferredCountryCode !== undefined ||
      data.preferredCurrencyCode !== undefined ||
      data.ttsVoice !== undefined,
    { message: 'At least one preference must be provided' },
  )
  .refine(
    (data) =>
      data.currencyPreferenceMode !== CurrencyPreferenceMode.MANUAL ||
      data.preferredCurrencyCode !== null,
    {
      message: 'MANUAL currency mode requires a preferred currency',
      path: ['preferredCurrencyCode'],
    },
  );

export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;
