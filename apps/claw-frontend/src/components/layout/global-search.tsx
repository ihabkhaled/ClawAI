'use client';

import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGlobalSearchController } from '@/hooks/layout/use-global-search-controller';
import { cn } from '@/lib/utils';
import type { GlobalSearchProps } from '@/types';

import { SearchResults } from './search-results';

export function GlobalSearch({ className }: GlobalSearchProps) {
  const {
    inputRef,
    threads,
    isLoading,
    search,
    setSearch,
    isOpen,
    showResults,
    handleToggle,
    handleSelect,
    handleKeyDown,
    handleOpenChange,
  } = useGlobalSearchController();

  return (
    <div className={cn('relative', className)}>
      {isOpen ? (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search all threads..."
              className="h-9 w-64 ps-8 text-sm"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => handleOpenChange(false)}
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleToggle}
          aria-label="Search threads"
        >
          <Search className="h-4 w-4" />
        </Button>
      )}

      {showResults ? (
        <div className="absolute end-0 top-full z-50 mt-1 w-80 rounded-md border bg-popover p-1 shadow-md">
          <SearchResults isLoading={isLoading} threads={threads} onSelect={handleSelect} />
        </div>
      ) : null}
    </div>
  );
}
