import {
  UNLABELLED_UPLOAD_MIME_TYPE,
  UPLOAD_MIME_BY_EXTENSION,
} from '@/constants/upload-mime.constants';

/**
 * The MIME type an upload is sent as. The browser's own label wins; when it has
 * none (or only the generic one) a known media extension decides, so an iPhone
 * photo or a raw HEVC clip is not uploaded as an opaque binary.
 */
export function resolveUploadMimeType(file: Pick<File, 'name' | 'type'>): string {
  if (file.type.length > 0 && file.type !== UNLABELLED_UPLOAD_MIME_TYPE) {
    return file.type;
  }
  const dot = file.name.lastIndexOf('.');
  const extension = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : '';
  return UPLOAD_MIME_BY_EXTENSION.get(extension) ?? UNLABELLED_UPLOAD_MIME_TYPE;
}
