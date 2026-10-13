import { Skeleton } from '@/components/ui/skeleton';
import type { FileLibraryListStateProps } from '@/types/file-library-ui.types';

/** Loading, error and empty copy for a library list: one calm line each. */
export function FileLibraryListState({
  isLoading,
  isError,
  hasQuery,
  hasFiles = false,
  query,
  t,
}: FileLibraryListStateProps): React.ReactElement {
  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-2 px-2 py-1"
        aria-busy="true"
        aria-label={t('chat.fileLibrary.loading')}
        data-testid="file-library-loading"
      >
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  let message = t('chat.fileLibrary.empty');
  if (isError) {
    message = t('chat.fileLibrary.loadError');
  } else if (hasQuery) {
    message = t('chat.fileLibrary.noResults', { query: query.trim() });
  } else if (hasFiles) {
    message = t('chat.fileLibrary.noMatches');
  }

  return (
    <p
      className="text-muted-foreground px-2 py-6 text-center text-sm break-words"
      role={isError ? 'alert' : 'status'}
      data-testid="file-library-empty"
    >
      {message}
    </p>
  );
}
