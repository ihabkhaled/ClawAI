import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CreditFallbackModeCard } from '@/components/settings/credit-fallback-mode-card';
import { CreditFallbackMode } from '@/enums';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('CreditFallbackModeCard', () => {
  it('labels the control and shows the current (default) choice', () => {
    render(
      <CreditFallbackModeCard
        value={CreditFallbackMode.Fallback}
        isPending={false}
        onChange={vi.fn()}
      />,
    );
    const combobox = screen.getByRole('combobox', { name: 'settings.creditFallbackModeLabel' });
    expect(combobox).toHaveTextContent('settings.creditFallbackModeFallback');
    expect(screen.getByText('settings.creditFallbackModeDescription')).toBeInTheDocument();
  });

  it('emits the picked mode', () => {
    const onChange = vi.fn();
    render(
      <CreditFallbackModeCard
        value={CreditFallbackMode.Fallback}
        isPending={false}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'settings.creditFallbackModeStop' }));
    expect(onChange).toHaveBeenCalledWith('STOP');
  });

  it('is disabled while the save is in flight', () => {
    render(<CreditFallbackModeCard value={CreditFallbackMode.Stop} isPending onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
