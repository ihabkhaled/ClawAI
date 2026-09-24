import { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';

import {
  isAudioMime,
  isImageMime,
  isPdfMime,
  isTextLikeMime,
  isVideoMime,
} from './file-type-icon.utility';

/**
 * What a sent-message attachment renders as. Every branch here used to be the
 * SAME branch — every mimeType went through `<img src={blobUrl}>`, which for
 * anything that is not actually image bytes renders the browser's built-in
 * broken-image glyph. This is the one place that decides otherwise.
 */
export function getAttachmentPreviewKind(
  mimeType: string,
  filename: string,
): AttachmentPreviewKind {
  if (isImageMime(mimeType)) {
    return AttachmentPreviewKind.Image;
  }
  if (isAudioMime(mimeType)) {
    return AttachmentPreviewKind.Audio;
  }
  if (isVideoMime(mimeType)) {
    return AttachmentPreviewKind.Video;
  }
  if (isPdfMime(mimeType, filename)) {
    return AttachmentPreviewKind.Pdf;
  }
  if (isTextLikeMime(mimeType, filename)) {
    return AttachmentPreviewKind.Text;
  }
  return AttachmentPreviewKind.Generic;
}
