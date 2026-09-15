import { useEffect, useMemo, useRef, useState } from 'react';

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
  // True once the country is the user's own doing — they picked one, or a
  // saved number implied one. Region detection must never overwrite that.
  const hasExplicitCountryRef = useRef(detectCountryFromE164(value) !== null);
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
    // A number that came from the database is the user's own; region detection
    // must never rewrite it afterwards.
    hasExplicitCountryRef.current = true;
    setSelectedCountryState(country);
    setNationalNumberState(parsed.nationalNumber);
  }, [value, selectedCountry, nationalNumber]);

  // Region detection arrives after the first paint, so the default cannot be
  // decided by the useState initializer alone. Applied only while the field is
  // still untouched: an Egyptian visitor gets +20 instead of +1, and anyone who
  // has already chosen a country or typed a number keeps what they had.
  useEffect(() => {
    if (hasExplicitCountryRef.current || nationalNumber !== '' || value !== '') {
      return;
    }
    const detected = findCountryByIso2(defaultCountryIso2, DEFAULT_COUNTRY_ISO2);
    setSelectedCountryState((current) => (current.iso2 === detected.iso2 ? current : detected));
  }, [defaultCountryIso2, nationalNumber, value]);

  const setNationalNumber = (next: string): void => {
    setNationalNumberState(next);
    onChange(toE164(selectedCountry.dialCode, next));
  };
  const setSelectedCountry = (country: CountryDialCode): void => {
    hasExplicitCountryRef.current = true;
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
