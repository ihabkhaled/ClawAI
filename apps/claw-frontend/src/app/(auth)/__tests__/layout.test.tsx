import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AuthLayout from '@/app/(auth)/layout';
import { APP_VERSION } from '@/constants';
import { Locale } from '@/enums/locale.enum';
import { LocaleProvider } from '@/lib/i18n';
import { en } from '@/lib/i18n/locales/en';

describe('AuthLayout', () => {
  it('shows the canonical app version on every authentication page', () => {
    render(
      <LocaleProvider initialLocale={Locale.EN} initialDictionary={en}>
        <AuthLayout>
          <main>Authentication page</main>
        </AuthLayout>
      </LocaleProvider>,
    );

    expect(screen.getByText(`Claw v${APP_VERSION}`)).toBeInTheDocument();
  });
});
