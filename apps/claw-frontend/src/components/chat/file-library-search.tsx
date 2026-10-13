import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FileLibrarySearchProps } from '@/types/file-library-ui.types';

/** The library search box: icon at the start, a clear button at the end (RTL-safe). */
export function FileLibrarySearch({
  value,
  onChange,
  placeholder,
  label,
  clearLabel,
}: FileLibrarySearchProps): React.ReactElement {
  return (
    <div className="relative">
      <Search
        className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        enterKeyHint="search"
        autoComplete="off"
        data-library-nav=""
        className="ps-9 pe-10"
      />
      {value.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={clearLabel}
          title={clearLabel}
          data-library-nav=""
          onClick={() => onChange('')}
          className="absolute end-1.5 top-1/2 -translate-y-1/2"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
