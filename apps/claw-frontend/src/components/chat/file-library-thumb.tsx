import { FileLibraryThumbSize } from '@/enums/file-library-thumb-size.enum';
import { useFileLibraryThumb } from '@/hooks/chat/use-file-library-thumb';
import { cn } from '@/lib/utils';
import type { FileLibraryThumbProps } from '@/types/file-library-ui.types';

/** A file's picture: its real thumbnail, or a quiet tinted type icon. */
export function FileLibraryThumb({ file, size }: FileLibraryThumbProps): React.ReactElement {
  const { src, Icon, tone, handleImageError, inViewRef } = useFileLibraryThumb(file);
  const isLarge = size === FileLibraryThumbSize.Large;

  return (
    <span
      ref={inViewRef}
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg',
        isLarge ? 'aspect-square w-full' : 'h-10 w-10',
        src === null ? tone : 'bg-muted',
      )}
      data-testid="file-library-thumb"
    >
      {src === null ? (
        <Icon className={isLarge ? 'h-8 w-8' : 'h-5 w-5'} aria-hidden="true" />
      ) : (
        <img
          alt=""
          src={src}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={handleImageError}
        />
      )}
    </span>
  );
}
