import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CloseLabel } from '@/components/ui/close-label';
import { Locale } from '@/enums/locale.enum';
import { LocaleProvider } from '@/lib/i18n';
import { ar } from '@/lib/i18n/locales/ar';

describe('CloseLabel', () => {
  it('falls back to English with no locale provider', () => {
    render(<CloseLabel />);

    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('uses the Arabic dictionary inside an Arabic locale', () => {
    render(
      <LocaleProvider initialLocale={Locale.AR} initialDictionary={ar}>
        <CloseLabel />
      </LocaleProvider>,
    );

    expect(ar.common.close).not.toBe('Close');
    expect(screen.getByText(ar.common.close)).toBeInTheDocument();
  });
});
