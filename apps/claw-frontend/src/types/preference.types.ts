import type { CurrencyPreferenceMode } from '@claw/shared-types';

import type { UserAppearancePreference, UserLanguagePreference } from '@/enums';

export type UpdatePreferencesRequest = {
  languagePreference?: UserLanguagePreference;
  appearancePreference?: UserAppearancePreference;
  // Display currency. Presentation state, which is why it lives here rather
  // than on the profile mutation that demands the current password.
  //
  // null CLEARS a stored value; omitting the field leaves it alone. The two are
  // different requests, and the server distinguishes them.
  currencyPreferenceMode?: CurrencyPreferenceMode;
  preferredCountryCode?: string | null;
  preferredCurrencyCode?: string | null;
  // "Read aloud" voice; null = back to each provider's default voice.
  ttsVoice?: string | null;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};
