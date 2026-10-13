import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeLibraryFile } from '@/components/chat/__tests__/file-library-fixtures';
import { FILE_LIBRARY_THUMB_MAX_BYTES } from '@/constants/file-library.constants';
import { FileLibraryFilter } from '@/enums/file-library-filter.enum';
import { FileLibraryViewMode } from '@/enums/file-library-view-mode.enum';
import {
  filterLibraryFiles,
  formatLibraryDate,
  getFileLibraryCategory,
  getVideoPosterSrc,
  isThumbnailableImage,
  moveFileLibraryFocus,
  readStoredLibraryViewMode,
  sortFilesNewestFirst,
  storeLibraryViewMode,
} from '@/utilities/file-library.utility';

const image = makeLibraryFile({ id: 'i', filename: 'cat.png', mimeType: 'image/png' });
const pdf = makeLibraryFile({ id: 'p', filename: 'plan.pdf' });
const audio = makeLibraryFile({ id: 'a', filename: 'note.webm', mimeType: 'audio/webm' });
const video = makeLibraryFile({ id: 'v', filename: 'clip.mp4', mimeType: 'video/mp4' });
const zip = makeLibraryFile({ id: 'z', filename: 'bundle.zip', mimeType: 'application/zip' });

describe('getFileLibraryCategory', () => {
  it('buckets by type, audio and video together', () => {
    expect(getFileLibraryCategory(image)).toBe(FileLibraryFilter.Images);
    expect(getFileLibraryCategory(pdf)).toBe(FileLibraryFilter.Documents);
    expect(getFileLibraryCategory(audio)).toBe(FileLibraryFilter.Media);
    expect(getFileLibraryCategory(video)).toBe(FileLibraryFilter.Media);
    expect(getFileLibraryCategory(zip)).toBe(FileLibraryFilter.Archives);
  });

  it('treats an expanded archive as an archive whatever its mime type says', () => {
    const expanded = makeLibraryFile({ mimeType: 'application/octet-stream', childCount: 3 });
    expect(getFileLibraryCategory(expanded)).toBe(FileLibraryFilter.Archives);
  });
});

describe('sortFilesNewestFirst', () => {
  it('orders newest first without mutating its input', () => {
    const older = makeLibraryFile({ id: 'old', createdAt: '2026-01-01T00:00:00Z' });
    const newer = makeLibraryFile({ id: 'new', createdAt: '2026-02-01T00:00:00Z' });
    const input = [older, newer];

    expect(sortFilesNewestFirst(input).map((f) => f.id)).toEqual(['new', 'old']);
    expect(input.map((f) => f.id)).toEqual(['old', 'new']);
  });
});

describe('filterLibraryFiles', () => {
  const all = [image, pdf, audio, video, zip];

  it('returns everything for no query and the All filter', () => {
    expect(filterLibraryFiles(all, '  ', FileLibraryFilter.All)).toHaveLength(5);
  });

  it('matches the name case-insensitively', () => {
    expect(filterLibraryFiles(all, 'PLAN', FileLibraryFilter.All)).toEqual([pdf]);
  });

  it('filters by type chip and combines it with the query', () => {
    expect(filterLibraryFiles(all, '', FileLibraryFilter.Media)).toEqual([audio, video]);
    expect(filterLibraryFiles(all, 'clip', FileLibraryFilter.Media)).toEqual([video]);
    expect(filterLibraryFiles(all, 'clip', FileLibraryFilter.Images)).toEqual([]);
  });
});

describe('formatLibraryDate', () => {
  it('formats a valid date and returns empty text for an invalid one', () => {
    expect(formatLibraryDate('2026-10-05T10:00:00Z')).not.toBe('');
    expect(formatLibraryDate('not a date')).toBe('');
  });

  it('formats in the language it is given, not the browser default', () => {
    expect(formatLibraryDate('2026-10-05T10:00:00Z', 'en')).toMatch(/Oct/);
    expect(formatLibraryDate('2026-10-05T10:00:00Z', 'de')).toMatch(/Okt/);
    expect(formatLibraryDate('2026-10-05T10:00:00Z', 'ja')).toMatch(/10月/);
  });
});

describe('isThumbnailableImage', () => {
  it('only downloads images under the size cap', () => {
    expect(isThumbnailableImage(image)).toBe(true);
    expect(isThumbnailableImage({ ...image, sizeBytes: FILE_LIBRARY_THUMB_MAX_BYTES + 1 })).toBe(
      false,
    );
    expect(isThumbnailableImage(pdf)).toBe(false);
  });
});

describe('getVideoPosterSrc', () => {
  it('builds a data URL from the stored poster, and is null without one', () => {
    const withPoster = makeLibraryFile({
      mimeType: 'video/mp4',
      extractionMetadata: { media: { thumbnailBase64: 'QUJD', thumbnailMimeType: 'image/webp' } },
    });
    expect(getVideoPosterSrc(withPoster)).toBe('data:image/webp;base64,QUJD');
    expect(getVideoPosterSrc(video)).toBeNull();
    expect(getVideoPosterSrc({ ...withPoster, mimeType: 'application/pdf' })).toBeNull();
  });

  it('defaults the poster type to jpeg', () => {
    const poster = makeLibraryFile({
      mimeType: 'video/mp4',
      extractionMetadata: { media: { thumbnailBase64: 'QUJD' } },
    });
    expect(getVideoPosterSrc(poster)).toBe('data:image/jpeg;base64,QUJD');
  });
});

describe('library view mode storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('defaults to grid, round-trips list, and ignores junk', () => {
    expect(readStoredLibraryViewMode()).toBe(FileLibraryViewMode.Grid);
    storeLibraryViewMode(FileLibraryViewMode.List);
    expect(readStoredLibraryViewMode()).toBe(FileLibraryViewMode.List);
    window.localStorage.setItem('claw.fileLibrary.viewMode', 'sideways');
    expect(readStoredLibraryViewMode()).toBe(FileLibraryViewMode.Grid);
  });

  it('survives a throwing localStorage on read and write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readStoredLibraryViewMode()).toBe(FileLibraryViewMode.Grid);
    expect(() => storeLibraryViewMode(FileLibraryViewMode.List)).not.toThrow();
  });
});

describe('moveFileLibraryFocus', () => {
  function setup(): { container: HTMLElement; items: HTMLElement[] } {
    const container = document.createElement('div');
    const items = ['input', 'button', 'button', 'button'].map((tag, index) => {
      const element = document.createElement(tag);
      element.setAttribute('data-library-nav', '');
      if (index === 3) {
        element.setAttribute('disabled', '');
      }
      return element;
    });
    container.append(...items);
    document.body.append(container);
    return { container, items };
  }

  function press(container: HTMLElement, key: string, target: HTMLElement): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: target });
    handled = moveFileLibraryFocus(container, event);
    return event;
  }
  let handled = false;

  it('walks down and up, clamped at both ends, skipping disabled items', () => {
    const { container, items } = setup();
    items[0]?.focus();

    expect(press(container, 'ArrowDown', items[0] as HTMLElement).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[1]);
    press(container, 'ArrowDown', items[1] as HTMLElement);
    expect(document.activeElement).toBe(items[2]);
    press(container, 'ArrowUp', items[2] as HTMLElement);
    expect(document.activeElement).toBe(items[1]);
    expect(handled).toBe(true);
    container.remove();
  });

  it('lets ArrowUp on the first and ArrowDown on the last item bubble out unhandled', () => {
    const { container, items } = setup();
    items[0]?.focus();
    const up = press(container, 'ArrowUp', items[0] as HTMLElement);
    expect(handled).toBe(false);
    expect(up.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(items[0]);

    items[2]?.focus();
    const down = press(container, 'ArrowDown', items[2] as HTMLElement);
    expect(handled).toBe(false);
    expect(down.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(items[2]);
    container.remove();
  });

  it('never handles Tab or Escape', () => {
    const { container, items } = setup();
    items[1]?.focus();
    expect(press(container, 'Tab', items[1] as HTMLElement).defaultPrevented).toBe(false);
    expect(handled).toBe(false);
    press(container, 'Escape', items[1] as HTMLElement);
    expect(handled).toBe(false);
    container.remove();
  });

  it('jumps with Home/End on buttons but leaves them to the caret in the search box', () => {
    const { container, items } = setup();
    items[1]?.focus();

    press(container, 'End', items[1] as HTMLElement);
    expect(document.activeElement).toBe(items[2]);
    press(container, 'Home', items[2] as HTMLElement);
    expect(document.activeElement).toBe(items[0]);

    items[2]?.focus();
    const typed = press(container, 'Home', items[0] as HTMLElement);
    expect(typed.defaultPrevented).toBe(false);
    expect(handled).toBe(false);
    expect(document.activeElement).toBe(items[2]);
    container.remove();
  });

  it('ignores other keys and an empty container', () => {
    const empty = document.createElement('div');
    expect(press(empty, 'ArrowDown', empty).defaultPrevented).toBe(false);
    const { container, items } = setup();
    expect(press(container, 'a', items[1] as HTMLElement).defaultPrevented).toBe(false);
    container.remove();
  });
});
