import { useEffect, useMemo, useState } from 'react';

import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY_ISO2 } from '@/constants/country-dial-codes.constants';
import {
  detectCountryFromE164,
  findCountryByIso2,
  isE164,
  parseE164,
  toE164,
} from '@/utilities/phone.utility';

import type { UsePhoneInputReturn } from '../../types/hook.types';
import type { CountryDialCode } from '../../types/phone.types';

export function usePhoneInput(
  value: string,
  onChange: (value: string) => void,
  defaultCountryIso2: string = DEFAULT_COUNTRY_ISO2,
): UsePhoneInputReturn {
  // An already-saved number has to show up in the field. Editing a profile
  // starts with one, and a field that rendered blank over a stored number
  // invited the user to save an empty phone without noticing.
  const [selectedCountry, setSelectedCountryState] = useState(
    () =>
      detectCountryFromE164(value) ?? findCountryByIso2(defaultCountryIso2, DEFAULT_COUNTRY_ISO2),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [nationalNumber, setNationalNumberState] = useState(
    () => parseE164(value)?.nationalNumber ?? '',
  );
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
  // The saved number often arrives after the first render, so a value this
  // field did not compose itself is adopted rather than ignored.
  useEffect(() => {
    if (value === toE164(selectedCountry.dialCode, nationalNumber)) {
      return;
    }
    const parsed = parseE164(value);
    const country = detectCountryFromE164(value);
    if (!parsed || !country) {
      return;
    }
    setSelectedCountryState(country);
    setNationalNumberState(parsed.nationalNumber);
  }, [value, selectedCountry, nationalNumber]);

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
