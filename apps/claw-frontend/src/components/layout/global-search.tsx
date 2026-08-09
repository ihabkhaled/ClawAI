'use client';

import { Search, X } from 'lucide-react';

import { KbdHint } from '@/components/common/kbd-hint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGlobalSearchController } from '@/hooks/layout/use-global-search-controller';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { GlobalSearchProps } from '@/types';
import { getModKeyLabel } from '@/utilities';

import { SearchResults } from './search-results';

export function GlobalSearch({ className }: GlobalSearchProps) {
  const {
    inputRef,
    containerRef,
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
  const { t } = useTranslation();

  return (
    <div ref={containerRef} className={cn('relative min-w-0', className)}>
      {isOpen ? (
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative min-w-0">
            <Search className="text-muted-foreground absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            {/* The expanded field is capped to a share of the viewport on
             * mobile. At a fixed w-64 it pushed the locale / theme / user
             * controls off the end of the topbar, and they only came back when
             * the search was closed again. */}
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.globalSearchPlaceholder')}
              className="h-9 w-[38vw] max-w-64 min-w-0 ps-8 text-sm sm:w-64"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => handleOpenChange(false)}
            aria-label={t('accessibility.closeSearch')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile: icon-only trigger, keeps the topbar tight. */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:hidden"
            onClick={handleToggle}
            aria-label={t('accessibility.openSearch')}
          >
            <Search className="h-4 w-4" />
          </Button>
          {/* Desktop (sm+): labeled trigger with a Cmd/Ctrl+K hint pill. The
           * pill is decorative — the actual binding lives in
           * useGlobalSearchController via useKeyboardShortcut('mod+k'). */}
          <Button
            variant="ghost"
            onClick={handleToggle}
            aria-label={t('accessibility.openSearch')}
            className="text-muted-foreground hover:text-foreground hidden h-9 items-center gap-2 px-2.5 text-sm font-normal transition-colors sm:inline-flex"
          >
            <Search className="h-4 w-4" />
            <span>{t('accessibility.search')}</span>
            <KbdHint keys={[getModKeyLabel(), 'K']} className="ms-1" />
          </Button>
        </>
      )}

      {showResults ? (
        <div className="bg-popover absolute end-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-md border p-1 shadow-md">
          <SearchResults isLoading={isLoading} threads={threads} onSelect={handleSelect} />
        </div>
      ) : null}
    </div>
  );
}
