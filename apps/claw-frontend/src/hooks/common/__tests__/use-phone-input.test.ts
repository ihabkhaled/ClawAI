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

describe('usePhoneInput — region default vs a saved number', () => {
  it('adopts the detected region while the field is empty', () => {
    // A visitor in Egypt should be offered +20, not +1. Detection arrives after
    // the first paint, so the initial useState value cannot carry it.
    const { result, rerender } = renderHook(
      ({ iso2 }: { iso2: string }) => usePhoneInput('', vi.fn(), iso2),
      { initialProps: { iso2: 'US' } },
    );
    expect(result.current.selectedCountry.iso2).toBe('US');

    rerender({ iso2: 'EG' });

    expect(result.current.selectedCountry.iso2).toBe('EG');
    expect(result.current.selectedCountry.dialCode).toBe('+20');
  });

  it('never overrides a number already saved on the account', () => {
    // Profile: the phone comes from the database. Region detection landing
    // afterwards must not rewrite the user's own country.
    const { result, rerender } = renderHook(
      ({ iso2 }: { iso2: string }) => usePhoneInput('+447700900123', vi.fn(), iso2),
      { initialProps: { iso2: 'US' } },
    );
    expect(result.current.selectedCountry.iso2).toBe('GB');

    rerender({ iso2: 'EG' });

    expect(result.current.selectedCountry.iso2).toBe('GB');
  });

  it('never overrides a country the user picked themselves', () => {
    const { result, rerender } = renderHook(
      ({ iso2 }: { iso2: string }) => usePhoneInput('', vi.fn(), iso2),
      { initialProps: { iso2: 'US' } },
    );
    const japan = COUNTRY_DIAL_CODES.find((country) => country.iso2 === 'JP');
    act(() => {
      if (japan !== undefined) {
        result.current.setSelectedCountry(japan);
      }
    });

    rerender({ iso2: 'EG' });

    expect(result.current.selectedCountry.iso2).toBe('JP');
  });
});
