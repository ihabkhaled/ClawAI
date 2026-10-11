import type { ReactElement } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FILTER_ALL_VALUE } from '@/constants/observability-explorer.constants';
import type { FilterSelectProps } from '@/types/observability-explorer.types';

/** One filter dropdown. "All" is a sentinel because Radix Select cannot hold an empty value. */
export function FilterSelect({
  id,
  label,
  value,
  allLabel,
  options,
  onChange,
}: FilterSelectProps): ReactElement {
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <Select
        value={value === '' ? FILTER_ALL_VALUE : value}
        onValueChange={(next) => {
          onChange(next === FILTER_ALL_VALUE ? '' : next);
        }}
      >
        <SelectTrigger id={id} className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTER_ALL_VALUE}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
