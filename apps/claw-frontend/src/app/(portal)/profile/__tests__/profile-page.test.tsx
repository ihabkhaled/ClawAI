import { render, renderHook, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from '@/app/(portal)/profile/page';
import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';
import type { ProfileIdentityFormValues } from '@/lib/validation/profile.schema';

// PasswordInput and PhoneInput read the dictionary directly, so the page needs
// a locale even though the page itself takes t() from its hook.
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    dir: Direction.LTR,
    locale: Locale.EN,
    t: (key: string) => key,
  }),
}));

const mockHook = vi.fn();

vi.mock('@/hooks/profile/use-profile-page', () => ({
  useProfilePage: () => mockHook(),
}));

const savedUser: ProfileIdentityFormValues = {
  firstName: 'Claw',
  lastName: 'Khaled',
  phone: '+14155550123',
  username: 'claw',
  currentPassword: '',
};

function renderPage(overrides: Record<string, unknown> = {}): void {
  const { result } = renderHook(() =>
    useForm<ProfileIdentityFormValues>({ defaultValues: savedUser }),
  );
  mockHook.mockReturnValue({
    form: result.current,
    t: (key: string) => key,
    isLoading: false,
    isSaving: false,
    email: 'admin@claw-ai.co',
    save: vi.fn(),
    ...overrides,
  });
  render(<ProfilePage />);
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The phone field was a bare text box that only accepted a hand-typed E.164
  // string. It is now the same country-code control the sign-up form uses.
  it('edits the phone through the country picker, not a bare text box', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'common.phoneCountryLabel' })).toBeInTheDocument();
    expect(screen.getByLabelText('common.phoneNumberLabel')).toBeInTheDocument();
  });

  it('splits the saved number into its dial code and national part', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'common.phoneCountryLabel' })).toHaveTextContent(
      '+1',
    );
    expect(screen.getByLabelText('common.phoneNumberLabel')).toHaveValue('4155550123');
  });

  it('tells the user a rename only signs out their other devices', () => {
    renderPage();

    expect(screen.getByText('profile.usernameNotice')).toBeInTheDocument();
  });
});
