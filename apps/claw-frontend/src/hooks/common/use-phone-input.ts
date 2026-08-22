import { useMemo, useState } from 'react';

import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY_ISO2 } from '@/constants/country-dial-codes.constants';
import { findCountryByIso2, isE164, toE164 } from '@/utilities/phone.utility';

import type { UsePhoneInputReturn } from '../../types/hook.types';
import type { CountryDialCode } from '../../types/phone.types';

export function usePhoneInput(
  value: string,
  onChange: (value: string) => void,
  defaultCountryIso2: string = DEFAULT_COUNTRY_ISO2,
): UsePhoneInputReturn {
  const [selectedCountry, setSelectedCountryState] = useState(() =>
    findCountryByIso2(defaultCountryIso2, DEFAULT_COUNTRY_ISO2),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [nationalNumber, setNationalNumberState] = useState('');
  const filteredCountries = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return COUNTRY_DIAL_CODES;
    }
    return COUNTRY_DIAL_CODES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.iso2.toLowerCase().includes(query) ||
        country.dialCode.includes(query),
    );
  }, [filter]);
  const setNationalNumber = (next: string): void => {
    setNationalNumberState(next);
    onChange(toE164(selectedCountry.dialCode, next));
  };
  const setSelectedCountry = (country: CountryDialCode): void => {
    setSelectedCountryState(country);
    onChange(toE164(country.dialCode, nationalNumber));
  };
  return {
    selectedCountry,
    setSelectedCountry,
    isOpen,
    setIsOpen,
    filter,
    setFilter,
    filteredCountries,
    nationalNumber,
    setNationalNumber,
    value,
    isValid: isE164(value),
  };
}
