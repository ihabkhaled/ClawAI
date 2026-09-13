'use client';

import { Check } from 'lucide-react';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { CurrencySwitcherOptionItemProps } from '@/types/display-currency.types';

// One row of the currency picker. The ISO code is shown beside the localized
// name because the code is what appears next to every price on the page, and a
// visitor scanning for "EGP" should find the same three letters here.
export function CurrencySwitcherOptionItem({
  code,
  label,
  isActive,
  onSelect,
}: CurrencySwitcherOptionItemProps): React.ReactElement {
  return (
    <DropdownMenuItem
      onClick={() => {
        onSelect(code);
      }}
      className={isActive ? 'bg-accent font-medium' : ''}
    >
      <Check
        className={`me-2 h-4 w-4 ${isActive ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />
      <span className="text-muted-foreground me-2 w-8 text-xs font-medium">{code}</span>
      {label}
    </DropdownMenuItem>
  );
}
