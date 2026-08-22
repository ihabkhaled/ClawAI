import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PasswordInput } from '@/components/common/password-input';
import { Direction } from '@/enums/direction.enum';
import { Locale } from '@/enums/locale.enum';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    dir: Direction.LTR,
    locale: Locale.EN,
    t: (key: string) => key,
  }),
}));

describe('PasswordInput', () => {
  it('renders an <input> whose type starts as "password"', () => {
    render(<PasswordInput id="test" placeholder="password" />);
    const input = screen.getByPlaceholderText('password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders a toggle button with correct initial aria attributes', () => {
    render(<PasswordInput id="test" placeholder="password" />);
    const button = screen.getByRole('button', { name: 'auth.showPasswordAria' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('flips input type and aria attributes on click, and then flips back', () => {
    render(<PasswordInput id="test" placeholder="password" />);
    const input = screen.getByPlaceholderText('password');
    const button = screen.getByRole('button', { name: 'auth.showPasswordAria' });

    // First click: show
    fireEvent.click(button);
    expect(input).toHaveAttribute('type', 'text');
    const hideButton = screen.getByRole('button', { name: 'auth.hidePasswordAria' });
    expect(hideButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'auth.showPasswordAria' })).not.toBeInTheDocument();

    // Second click: hide
    fireEvent.click(hideButton);
    expect(input).toHaveAttribute('type', 'password');
    const showButton = screen.getByRole('button', { name: 'auth.showPasswordAria' });
    expect(showButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'auth.hidePasswordAria' })).not.toBeInTheDocument();
  });

  it('disables both the input and the toggle button when disabled is passed', () => {
    render(<PasswordInput id="test" placeholder="password" disabled />);
    const input = screen.getByPlaceholderText('password');
    const button = screen.getByRole('button', { name: 'auth.showPasswordAria' });
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('forwards extra props to the input', () => {
    render(
      <PasswordInput id="test" placeholder="password" autoComplete="current-password" name="pwd" />,
    );
    const input = screen.getByPlaceholderText('password');
    expect(input).toHaveAttribute('id', 'test');
    expect(input).toHaveAttribute('autoComplete', 'current-password');
    expect(input).toHaveAttribute('name', 'pwd');
  });
});
