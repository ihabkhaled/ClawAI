import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { COUNTRY_DIAL_CODES } from '@/constants/country-dial-codes.constants';

import { usePhoneInput } from '../use-phone-input';

describe('usePhoneInput', () => {
  it('uses the default country', () => {
    const { result } = renderHook(() => usePhoneInput('', vi.fn()));
    expect(result.current.selectedCountry.iso2).toBe('US');
  });

  it('filters countries case-insensitively by name, ISO-2, and dial code', () => {
    const { result } = renderHook(() => usePhoneInput('', vi.fn()));

    for (const [query, iso2] of [
      ['egyPT', 'EG'],
      ['gb', 'GB'],
      ['+81', 'JP'],
    ] as const) {
      act(() => result.current.setFilter(query));
      expect(result.current.filteredCountries.some((country) => country.iso2 === iso2)).toBe(true);
    }
  });

  it('recomposes the emitted E.164 value when the country changes', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => usePhoneInput('', onChange));
    const egypt = COUNTRY_DIAL_CODES.find((country) => country.iso2 === 'EG');
    expect(egypt).toBeDefined();
    if (!egypt) {
      throw new Error('Egypt fixture is missing');
    }

    act(() => result.current.setNationalNumber('010 123 4567'));
    onChange.mockClear();
    act(() => result.current.setSelectedCountry(egypt));

    expect(onChange).toHaveBeenCalledWith('+20101234567');
  });
});
