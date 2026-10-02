import { COUNTRY_DIAL_CODES } from '@/constants/country-dial-codes.constants';
import type { CountryDialCode, PhoneInputValue } from '@/types/phone.types';

const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export function flagEmojiFromIso2(iso2: string): string {
  const upper = iso2.toUpperCase();
  const codePoints = [...upper].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

export function toE164(dialCode: string, nationalNumber: string): string {
  const digitsOnly = nationalNumber.replaceAll(/\D/gu, '').replace(/^0/u, '');
  return `${dialCode}${digitsOnly}`;
}

/**
 * Like toE164, but no digits typed means no phone at all. Emitting the bare
 * dial code ("+20") made an untouched optional field fail validation on submit
 * with an error the user had no way to understand.
 */
export function toOptionalE164(dialCode: string, nationalNumber: string): string {
  return nationalNumber.replaceAll(/\D/gu, '').length === 0 ? '' : toE164(dialCode, nationalNumber);
}

export function isE164(value: string): boolean {
  return E164_PATTERN.test(value);
}

export function parseE164(value: string): PhoneInputValue | null {
  if (!isE164(value)) {
    return null;
  }
  const country = detectCountryFromE164(value);
  if (!country) {
    return null;
  }
  return {
    dialCode: country.dialCode,
    nationalNumber: value.slice(country.dialCode.length),
  };
}

export function findCountryByIso2(iso2: string, fallbackIso2: string): CountryDialCode {
  const fallback: CountryDialCode = {
    iso2: 'US',
    dialCode: '+1',
    name: 'United States',
    flag: '🇺🇸',
  };
  return (
    COUNTRY_DIAL_CODES.find((country) => country.iso2 === iso2) ??
    COUNTRY_DIAL_CODES.find((country) => country.iso2 === fallbackIso2) ??
    fallback
  );
}

export function detectCountryFromE164(value: string): CountryDialCode | null {
  if (!isE164(value)) {
    return null;
  }
  let match: CountryDialCode | null = null;
  for (const country of COUNTRY_DIAL_CODES) {
    if (!value.startsWith(country.dialCode)) {
      continue;
    }
    if (!match || country.dialCode.length > match.dialCode.length) {
      match = country;
    }
  }
  return match;
}
