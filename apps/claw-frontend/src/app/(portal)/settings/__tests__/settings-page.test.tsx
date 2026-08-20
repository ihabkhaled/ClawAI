import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SettingsPage from '@/app/(portal)/settings/page';
import { UserAppearancePreference, UserLanguagePreference } from '@/enums';

const mockSettingsPage = vi.fn();

vi.mock('@/hooks/settings/use-settings-page', () => ({
  useSettingsPage: () => mockSettingsPage(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function formState() {
  return {
    register: vi.fn(() => ({})),
    formState: { errors: {} },
    handleSubmit: vi.fn((handler) => handler),
  };
}

describe('SettingsPage mobile layout', () => {
  it('allows appearance choices to wrap within narrow cards', () => {
    mockSettingsPage.mockReturnValue({
      user: { role: 'USER' },
      isLoading: false,
      isPending: false,
      currentLanguage: UserLanguagePreference.EN,
      currentAppearance: UserAppearancePreference.SYSTEM,
      handleLanguageChange: vi.fn(),
      handleAppearanceChange: vi.fn(),
      passwordForm: formState(),
      handlePasswordSubmit: vi.fn(),
      isPasswordPending: false,
      profileForm: formState(),
      deleteForm: formState(),
      updateProfile: vi.fn(),
      deleteAccount: vi.fn(),
      isProfilePending: false,
      isDeletePending: false,
    });

    render(<SettingsPage />);

    const systemChoice = screen.getByRole('button', { name: 'settings.appearanceSystem' });
    expect(systemChoice.parentElement).toHaveClass('flex-wrap');
  });
});
