import { Archive } from 'lucide-react';

import {
  FILE_LIBRARY_NAV_SELECTOR,
  FILE_LIBRARY_THUMB_MAX_BYTES,
  FILE_LIBRARY_VIEW_STORAGE_KEY,
} from '@/constants/file-library.constants';
import { FileLibraryFilter } from '@/enums/file-library-filter.enum';
import { FileLibraryViewMode } from '@/enums/file-library-view-mode.enum';
import type { UploadedFile } from '@/types/file.types';
import { isArchiveFile } from '@/utilities/archive-status.utility';
import {
  getFileTypeDescriptor,
  isAudioMime,
  isImageMime,
  isVideoMime,
} from '@/utilities/file-type-icon.utility';

/** The one type bucket a file belongs to (never `All`, which is "no filter"). */
export function getFileLibraryCategory(file: UploadedFile): FileLibraryFilter {
  if (isImageMime(file.mimeType)) {
    return FileLibraryFilter.Images;
  }
  if (isAudioMime(file.mimeType) || isVideoMime(file.mimeType)) {
    return FileLibraryFilter.Media;
  }
  if (isArchiveFile(file) || getFileTypeDescriptor(file.mimeType, file.filename).Icon === Archive) {
    return FileLibraryFilter.Archives;
  }
  return FileLibraryFilter.Documents;
}

/** Newest first, without mutating the cached list. */
export function sortFilesNewestFirst(files: readonly UploadedFile[]): UploadedFile[] {
  return [...files].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function filterLibraryFiles(
  files: readonly UploadedFile[],
  query: string,
  filter: FileLibraryFilter,
): UploadedFile[] {
  const needle = query.trim().toLowerCase();
  return files.filter((file) => {
    if (filter !== FileLibraryFilter.All && getFileLibraryCategory(file) !== filter) {
      return false;
    }
    return needle.length === 0 || file.filename.toLowerCase().includes(needle);
  });
}

/** "Oct 5" — short, in the app's language (not the browser's), never English-only. */
export function formatLibraryDate(isoDate: string, language?: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(language, { month: 'short', day: 'numeric' });
}

/** True when the file's own bytes are worth downloading just to draw a thumbnail. */
export function isThumbnailableImage(file: UploadedFile): boolean {
  return isImageMime(file.mimeType) && file.sizeBytes <= FILE_LIBRARY_THUMB_MAX_BYTES;
}

/** The small poster the video pipeline already stored, as a data URL, or null. */
export function getVideoPosterSrc(file: UploadedFile): string | null {
  const media = file.extractionMetadata?.media;
  if (!media?.thumbnailBase64 || !isVideoMime(file.mimeType)) {
    return null;
  }
  return `data:${media.thumbnailMimeType ?? 'image/jpeg'};base64,${media.thumbnailBase64}`;
}

/** The remembered grid/list choice; any storage failure reads as the default (grid). */
export function readStoredLibraryViewMode(): FileLibraryViewMode {
  try {
    const stored = window.localStorage.getItem(FILE_LIBRARY_VIEW_STORAGE_KEY);
    return stored === FileLibraryViewMode.List
      ? FileLibraryViewMode.List
      : FileLibraryViewMode.Grid;
  } catch {
    // Private window / blocked site data: the choice just is not remembered.
    return FileLibraryViewMode.Grid;
  }
}

export function storeLibraryViewMode(mode: FileLibraryViewMode): void {
  try {
    window.localStorage.setItem(FILE_LIBRARY_VIEW_STORAGE_KEY, mode);
  } catch {
    // Not remembered; the on-screen choice still applies.
  }
}

/**
 * Arrow/Home/End focus movement across the library's `data-library-nav` items.
 * Returns true only when the key moved focus INSIDE the library. ArrowUp on the
 * first item and ArrowDown on the last return false and are left alone, so a
 * hosting menu can carry focus on into its other sections.
 */
export function moveFileLibraryFocus(container: HTMLElement, event: KeyboardEvent): boolean {
  const isTyping = event.target instanceof HTMLInputElement;
  const isBoundary = event.key === 'Home' || event.key === 'End';
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && !(isBoundary && !isTyping)) {
    return false;
  }
  const items = Array.from(container.querySelectorAll<HTMLElement>(FILE_LIBRARY_NAV_SELECTOR));
  const current = items.findIndex((item) => item === document.activeElement);
  const isLeavingUp = event.key === 'ArrowUp' && current === 0;
  const isLeavingDown = event.key === 'ArrowDown' && current === items.length - 1;
  if (items.length === 0 || isLeavingUp || isLeavingDown) {
    return false;
  }
  event.preventDefault();
  let next = items.length - 1;
  if (event.key === 'ArrowDown') {
    next = Math.min(items.length - 1, current + 1);
  } else if (event.key === 'ArrowUp') {
    next = Math.max(0, current - 1);
  } else if (event.key === 'Home') {
    next = 0;
  }
  items[next]?.focus();
  return true;
}
