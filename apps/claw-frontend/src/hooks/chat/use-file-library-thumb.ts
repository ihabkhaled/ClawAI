import { useCallback, useState } from 'react';

import { FILE_LIBRARY_THUMB_ROOT_MARGIN } from '@/constants/file-library.constants';
import { useInView } from '@/hooks/common/use-in-view';
import { useFileThumbnailBlob } from '@/hooks/files/use-file-thumbnail-blob';
import type { UseFileLibraryThumbReturn } from '@/types/file-library-ui.types';
import type { UploadedFile } from '@/types/file.types';
import { getVideoPosterSrc, isThumbnailableImage } from '@/utilities/file-library.utility';
import { getFileTypeDescriptor } from '@/utilities/file-type-icon.utility';

/**
 * The picture for a library row: the image itself (fetched once per file, and
 * only once the row is on screen), a video's stored poster, or — when there is
 * nothing to draw, it is too big, or it fails to decode — the type icon. Only
 * an image under the size cap is downloaded at all.
 */
export function useFileLibraryThumb(file: UploadedFile): UseFileLibraryThumbReturn {
  const wantsImage = isThumbnailableImage(file);
  const { inViewRef, isInView } = useInView(FILE_LIBRARY_THUMB_ROOT_MARGIN);
  const { blobUrl, isError } = useFileThumbnailBlob(file.id, wantsImage && isInView);
  const [hasDecodeError, setHasDecodeError] = useState(false);
  const handleImageError = useCallback((): void => setHasDecodeError(true), []);
  const { Icon, tone } = getFileTypeDescriptor(file.mimeType, file.filename);

  const imageSrc = wantsImage && !isError && !hasDecodeError ? blobUrl : null;
  return { src: imageSrc ?? getVideoPosterSrc(file), Icon, tone, handleImageError, inViewRef };
}
