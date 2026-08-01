import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleSwitcher } from '@/components/layout/locale-switcher';

const setLocale = vi.fn();
const replaceLocale = vi.fn();
const updatePreferences = vi.fn();

vi.mock('@/hooks/use-locale', () => ({
  useLocale: () => ({ locale: 'en', dir: 'ltr', setLocale }),
}));

vi.mock('@/hooks/use-locale-navigation', () => ({
  useLocaleNavigation: () => ({ replaceLocale }),
}));

vi.mock('@/hooks/settings/use-update-preferences', () => ({
  useUpdatePreferences: () => ({ updatePreferences, isPending: false }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: () => 'Select language', locale: 'en', dir: 'ltr' }),
  SUPPORTED_LOCALES: [
    { locale: 'en', label: 'English', shortLabel: 'EN', dir: 'ltr' },
    { locale: 'ar', label: 'العربية', shortLabel: 'ع', dir: 'rtl' },
    { locale: 'fr', label: 'Français', shortLabel: 'FR', dir: 'ltr' },
    { locale: 'it', label: 'Italiano', shortLabel: 'IT', dir: 'ltr' },
    { locale: 'de', label: 'Deutsch', shortLabel: 'DE', dir: 'ltr' },
    { locale: 'es', label: 'Español', shortLabel: 'ES', dir: 'ltr' },
    { locale: 'ru', label: 'Русский', shortLabel: 'RU', dir: 'ltr' },
    { locale: 'pt', label: 'Português', shortLabel: 'PT', dir: 'ltr' },
    { locale: 'hi', label: 'हिन्दी', shortLabel: 'हि', dir: 'ltr' },
    { locale: 'ja', label: '日本語', shortLabel: '日', dir: 'ltr' },
    { locale: 'th', label: 'ไทย', shortLabel: 'ท', dir: 'ltr' },
    { locale: 'fa', label: 'فارسی', shortLabel: 'ف', dir: 'rtl' },
    { locale: 'zh', label: '简体中文', shortLabel: '中', dir: 'ltr' },
  ],
}));

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('presents the current language as a labeled language control', () => {
    render(<LocaleSwitcher />);

    const trigger = screen.getByRole('button', { name: 'English, Select language' });
    expect(trigger).toHaveTextContent('English');
    expect(trigger.querySelectorAll('svg')).toHaveLength(2);
    expect(trigger).toHaveClass('border');
  });

  it('shows all supported languages and persists a selection', async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher />);

    await user.click(screen.getByRole('button', { name: 'English, Select language' }));
    expect(screen.getAllByRole('menuitem')).toHaveLength(13);
    await user.click(screen.getByRole('menuitem', { name: /ar\s*العربية/i }));

    expect(setLocale).toHaveBeenCalledWith('ar');
    expect(replaceLocale).toHaveBeenCalledWith('ar');
    expect(updatePreferences).toHaveBeenCalledWith({ languagePreference: 'AR' });
  });
});
