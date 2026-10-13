import { Button } from '@/components/ui/button';
import { FILE_LIBRARY_FILTER_OPTIONS } from '@/constants/file-library.constants';
import { cn } from '@/lib/utils';
import type { FileLibraryFilterChipsProps } from '@/types/file-library-ui.types';

/** Type filter chips. One scrolling row on a narrow screen, never a wrapped wall. */
export function FileLibraryFilterChips({
  filter,
  onChange,
  t,
}: FileLibraryFilterChipsProps): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={t('chat.fileLibrary.dialog.filtersLabel')}
      className="scroll-fade-inline-end -mx-1 flex min-w-0 shrink-0 scrollbar-none gap-1.5 overflow-x-auto px-1 pb-1"
    >
      {FILE_LIBRARY_FILTER_OPTIONS.map((option) => {
        const active = option.filter === filter;
        return (
          <Button
            key={option.filter}
            type="button"
            variant={active ? 'default' : 'outline'}
            size="sm"
            aria-pressed={active}
            data-library-nav=""
            onClick={() => onChange(option.filter)}
            className={cn(
              'h-8 shrink-0 rounded-full px-3 text-xs',
              active ? null : 'bg-transparent',
            )}
          >
            {t(option.labelKey)}
          </Button>
        );
      })}
    </div>
  );
}
