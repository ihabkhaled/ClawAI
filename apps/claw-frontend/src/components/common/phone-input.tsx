import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { usePhoneInput } from '@/hooks/common/use-phone-input';
import type { PhoneInputProps } from '@/types/component.types';
import { flagEmojiFromIso2 } from '@/utilities/phone.utility';

export function PhoneInput({
  value,
  onChange,
  defaultCountryIso2,
  countryLabel,
  countrySearchLabel,
  numberLabel,
  numberPlaceholder,
  invalidLabel,
  disabled,
}: PhoneInputProps) {
  const {
    selectedCountry,
    setSelectedCountry,
    isOpen,
    setIsOpen,
    filter,
    setFilter,
    filteredCountries,
    nationalNumber,
    setNationalNumber,
    isValid,
  } = usePhoneInput(value, onChange, defaultCountryIso2);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild disabled={disabled}>
            <Button
              type="button"
              variant="outline"
              aria-label={countryLabel}
              className="gap-1 px-3"
            >
              <span aria-hidden="true">{flagEmojiFromIso2(selectedCountry.iso2)}</span>
              <span>{selectedCountry.dialCode}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72 p-2" align="start">
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder={countrySearchLabel}
              aria-label={countrySearchLabel}
              className="mb-2"
            />
            <div className="max-h-72 overflow-y-auto">
              {filteredCountries.map((country) => (
                <Button
                  key={country.iso2}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedCountry(country);
                    setIsOpen(false);
                  }}
                  className="w-full justify-start gap-2 px-2 py-1.5 text-left font-normal"
                >
                  <span aria-hidden="true">{flagEmojiFromIso2(country.iso2)}</span>
                  <span>{country.name}</span>
                  <span className="text-muted-foreground ml-auto">{country.dialCode}</span>
                </Button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          type="tel"
          value={nationalNumber}
          onChange={(event) => setNationalNumber(event.target.value)}
          placeholder={numberPlaceholder}
          aria-label={numberLabel}
          error={!isValid && nationalNumber.length > 0}
          disabled={disabled}
          className="touch:basis-full min-w-0 flex-1"
        />
      </div>
      {!isValid && nationalNumber.length > 0 && invalidLabel ? (
        <span className="text-destructive text-xs">{invalidLabel}</span>
      ) : null}
    </div>
  );
}
