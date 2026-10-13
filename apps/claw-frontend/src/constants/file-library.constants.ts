import { FileLibraryFilter } from '@/enums/file-library-filter.enum';
import type { FileLibraryFilterOption } from '@/types/file-library-ui.types';

/** Files in the "+" menu's quick list when the search box is empty. */
export const FILE_LIBRARY_RECENT_COUNT = 4;

/** Files the quick list shows for a search: more than "recent", still bounded. */
export const FILE_LIBRARY_SEARCH_RESULT_COUNT = 12;

/** localStorage key for the dialog's grid/list choice (a per-viewer convenience). */
export const FILE_LIBRARY_VIEW_STORAGE_KEY = 'claw.fileLibrary.viewMode';

/**
 * Past this size an image is shown as a type icon instead of a thumbnail: a
 * thumbnail is the whole file downloaded, and a grid of 20 MB photos is not a
 * calm menu.
 */
export const FILE_LIBRARY_THUMB_MAX_BYTES = 5 * 1024 * 1024;

/**
 * A local preview of a file still uploading is decoded by the browser. Past this
 * size the type icon is shown instead and no object URL is created at all.
 */
export const FILE_LIBRARY_LOCAL_PREVIEW_MAX_BYTES = 10 * 1024 * 1024;

/** How long a fetched thumbnail stays cached after its last row unmounts. */
export const FILE_LIBRARY_THUMB_CACHE_MS = 10 * 60 * 1000;

/** Fetch a thumbnail slightly before it scrolls into view. */
export const FILE_LIBRARY_THUMB_ROOT_MARGIN = '120px';

export const FILE_LIBRARY_FILTER_OPTIONS: readonly FileLibraryFilterOption[] = [
  { filter: FileLibraryFilter.All, labelKey: 'chat.fileLibrary.filters.all' },
  { filter: FileLibraryFilter.Images, labelKey: 'chat.fileLibrary.filters.images' },
  { filter: FileLibraryFilter.Documents, labelKey: 'chat.fileLibrary.filters.documents' },
  { filter: FileLibraryFilter.Media, labelKey: 'chat.fileLibrary.filters.media' },
  { filter: FileLibraryFilter.Archives, labelKey: 'chat.fileLibrary.filters.archives' },
];

/** Everything the library's arrow keys can land on, in DOM order. */
export const FILE_LIBRARY_NAV_SELECTOR = '[data-library-nav]:not(:disabled)';
