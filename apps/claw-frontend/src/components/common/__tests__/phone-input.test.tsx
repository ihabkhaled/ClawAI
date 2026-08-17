import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PhoneInput } from '@/components/common/phone-input';

describe('PhoneInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    defaultCountryIso2: 'US' as const,
    countryLabel: 'Country',
    countrySearchLabel: 'Search country',
    numberLabel: 'Phone number',
    numberPlaceholder: 'Enter phone number',
    invalidLabel: 'Invalid phone number',
  };

  it('renders country trigger and telephone input', () => {
    render(<PhoneInput {...defaultProps} />);

    expect(screen.getByRole('button', { name: defaultProps.countryLabel })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: defaultProps.numberLabel })).toBeInTheDocument();
  });

  it('opens country menu and confirms the search input', async () => {
    const user = userEvent.setup();
    render(<PhoneInput {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: defaultProps.countryLabel });
    await user.click(trigger);

    expect(
      screen.getByRole('textbox', { name: defaultProps.countrySearchLabel }),
    ).toBeInTheDocument();
  });

  it('types Egypt in search and verifies filtering', async () => {
    const user = userEvent.setup();
    render(<PhoneInput {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: defaultProps.countryLabel });
    await user.click(trigger);

    const searchInput = screen.getByRole('textbox', { name: defaultProps.countrySearchLabel });
    await user.type(searchInput, 'Egypt');

    expect(screen.getByRole('button', { name: /Egypt/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /United States/i })).not.toBeInTheDocument();
  });

  it('enters a national number, selects Egypt and verifies onChange receives recomposed E.164 value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhoneInput {...defaultProps} onChange={onChange} />);

    const numberInput = screen.getByRole('textbox', { name: defaultProps.numberLabel });
    await user.type(numberInput, '1234567890');

    const trigger = screen.getByRole('button', { name: defaultProps.countryLabel });
    await user.click(trigger);

    const searchInput = screen.getByRole('textbox', { name: defaultProps.countrySearchLabel });
    await user.type(searchInput, 'Egypt');

    const egyptButton = screen.getByRole('button', { name: /Egypt/i });
    await user.click(egyptButton);

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith('+201234567890');
    });
  });
});
