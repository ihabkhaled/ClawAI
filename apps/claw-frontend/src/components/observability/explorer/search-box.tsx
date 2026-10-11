import { Search } from 'lucide-react';
import type { ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import { SEARCH_MAX_LENGTH } from '@/constants/observability-explorer.constants';
import type { SearchBoxProps } from '@/types/observability-explorer.types';

/** A labelled search field. The label is visible to assistive tech, not shown, to save room. */
export function SearchBox({ id, label, value, onChange }: SearchBoxProps): ReactElement {
  return (
    <div className="relative w-full sm:max-w-xs">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        autoComplete="off"
        maxLength={SEARCH_MAX_LENGTH}
        placeholder={label}
        value={value}
        className="ps-9"
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </div>
  );
}
