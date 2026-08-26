import { useCallback, useEffect, useState } from 'react';

import { TINY_IMAGE_PIXEL_THRESHOLD } from '@/constants/feedback.constants';
import { ImagePreviewStatus } from '@/enums';
import type { UseAttachmentPreviewReturn } from '@/types/feedback-hook.types';

// The viewer cannot know how big an attachment is until the browser decodes it,
// and it has to say something useful in the meantime. It also has to survive a
// file that never decodes: an expired blob URL rendered as a blank void with no
// hint that anything was wrong.
export function useAttachmentPreview(src: string): UseAttachmentPreviewReturn {
  const [status, setStatus] = useState<ImagePreviewStatus>(ImagePreviewStatus.LOADING);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    setStatus(ImagePreviewStatus.LOADING);
    setWidth(0);
    setHeight(0);
  }, [src]);

  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setWidth(event.currentTarget.naturalWidth);
    setHeight(event.currentTarget.naturalHeight);
    setStatus(ImagePreviewStatus.LOADED);
  }, []);

  const handleError = useCallback(() => {
    setStatus(ImagePreviewStatus.FAILED);
  }, []);

  return {
    status,
    width,
    height,
    // A one-pixel screenshot rendered at its natural size is indistinguishable
    // from a broken viewer, so anything this small is scaled up and pixelated
    // rather than shown as a dot in the middle of an empty panel.
    isTiny:
      status === ImagePreviewStatus.LOADED &&
      width <= TINY_IMAGE_PIXEL_THRESHOLD &&
      height <= TINY_IMAGE_PIXEL_THRESHOLD,
    handleLoad,
    handleError,
  };
}
