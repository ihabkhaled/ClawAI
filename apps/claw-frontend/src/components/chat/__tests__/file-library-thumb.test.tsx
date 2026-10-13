import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FileLibraryThumb } from '@/components/chat/file-library-thumb';
import { FILE_LIBRARY_THUMB_MAX_BYTES } from '@/constants/file-library.constants';
import { FileLibraryThumbSize } from '@/enums/file-library-thumb-size.enum';

import { makeLibraryFile } from './file-library-fixtures';

const blobState: {
  blobUrl: string | null;
  isError: boolean;
  requested: boolean[];
} = { blobUrl: 'blob:cat', isError: false, requested: [] };

vi.mock('@/hooks/files/use-file-thumbnail-blob', () => ({
  useFileThumbnailBlob: (_fileId: string, enabled: boolean) => {
    blobState.requested.push(enabled);
    return { blobUrl: enabled ? blobState.blobUrl : null, isError: blobState.isError };
  },
}));

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;
const observers: { callback: ObserverCallback; observe: ReturnType<typeof vi.fn> }[] = [];

class FakeIntersectionObserver {
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(callback: ObserverCallback) {
    observers.push({ callback, observe: this.observe });
  }
}

function report(isIntersecting: boolean): void {
  act(() => {
    for (const observer of observers) {
      observer.callback([{ isIntersecting }]);
    }
  });
}

const image = makeLibraryFile({ id: 'img', filename: 'cat.png', mimeType: 'image/png' });

beforeEach(() => {
  blobState.blobUrl = 'blob:cat';
  blobState.isError = false;
  blobState.requested = [];
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});
afterEach(() => vi.unstubAllGlobals());

describe('FileLibraryThumb', () => {
  it('draws the downloaded image once the row is on screen', () => {
    render(<FileLibraryThumb file={image} size={FileLibraryThumbSize.Small} />);
    report(true);

    expect(screen.getByTestId('file-library-thumb').querySelector('img')).toHaveAttribute(
      'src',
      'blob:cat',
    );
  });

  it('does not fetch an image that has not scrolled into view', () => {
    render(<FileLibraryThumb file={image} size={FileLibraryThumbSize.Small} />);

    expect(observers).toHaveLength(1);
    expect(observers[0]?.observe).toHaveBeenCalledTimes(1);
    expect(blobState.requested.every((enabled) => !enabled)).toBe(true);
    expect(screen.getByTestId('file-library-thumb').querySelector('img')).toBeNull();
  });

  it('keeps the image once seen, even when the observer reports it leaving', () => {
    render(<FileLibraryThumb file={image} size={FileLibraryThumbSize.Small} />);
    report(true);
    report(false);

    expect(screen.getByTestId('file-library-thumb').querySelector('img')).not.toBeNull();
  });

  it('fetches straight away where IntersectionObserver does not exist', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<FileLibraryThumb file={image} size={FileLibraryThumbSize.Small} />);

    expect(screen.getByTestId('file-library-thumb').querySelector('img')).toHaveAttribute(
      'src',
      'blob:cat',
    );
  });

  it('falls back to the type icon when the image will not decode', () => {
    render(<FileLibraryThumb file={image} size={FileLibraryThumbSize.Small} />);
    report(true);

    fireEvent.error(screen.getByTestId('file-library-thumb').querySelector('img') as HTMLElement);

    expect(screen.getByTestId('file-library-thumb').querySelector('img')).toBeNull();
    expect(screen.getByTestId('file-library-thumb').querySelector('svg')).not.toBeNull();
  });

  it('falls back to the icon when the download failed', () => {
    blobState.blobUrl = null;
    blobState.isError = true;
    render(<FileLibraryThumb file={image} size={FileLibraryThumbSize.Small} />);
    report(true);

    expect(screen.getByTestId('file-library-thumb').querySelector('img')).toBeNull();
  });

  it('never downloads a huge image or a document just to draw a thumbnail', () => {
    const { rerender } = render(
      <FileLibraryThumb
        file={{ ...image, sizeBytes: FILE_LIBRARY_THUMB_MAX_BYTES + 1 }}
        size={FileLibraryThumbSize.Small}
      />,
    );
    report(true);
    rerender(<FileLibraryThumb file={makeLibraryFile()} size={FileLibraryThumbSize.Small} />);
    report(true);

    expect(blobState.requested.every((enabled) => !enabled)).toBe(true);
  });

  it('uses the stored poster for a video', () => {
    blobState.blobUrl = null;
    const video = makeLibraryFile({
      mimeType: 'video/mp4',
      extractionMetadata: { media: { thumbnailBase64: 'QUJD', thumbnailMimeType: 'image/jpeg' } },
    });
    render(<FileLibraryThumb file={video} size={FileLibraryThumbSize.Large} />);

    expect(screen.getByTestId('file-library-thumb').querySelector('img')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,QUJD',
    );
  });

  it('is a square filling its cell at the large size and a fixed square at the small one', () => {
    const { rerender } = render(
      <FileLibraryThumb file={image} size={FileLibraryThumbSize.Large} />,
    );
    expect(screen.getByTestId('file-library-thumb').className).toMatch(/aspect-square/);

    rerender(<FileLibraryThumb file={image} size={FileLibraryThumbSize.Small} />);
    expect(screen.getByTestId('file-library-thumb').className).toMatch(/h-10 w-10/);
  });
});
