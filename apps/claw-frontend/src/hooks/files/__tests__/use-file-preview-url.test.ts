import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FILE_LIBRARY_LOCAL_PREVIEW_MAX_BYTES } from '@/constants/file-library.constants';
import { useFilePreviewUrl } from '@/hooks/files/use-file-preview-url';

function pngFile(name: string): File {
  return new File([new Uint8Array(4)], name, { type: 'image/png' });
}

describe('useFilePreviewUrl', () => {
  let counter = 0;
  const createObjectURL = vi.fn(() => `blob:preview-${String(++counter)}`);
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    counter = 0;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gives an image a preview URL and revokes it on unmount', () => {
    const file = pngFile('a.png');
    const { result, unmount } = renderHook(() => useFilePreviewUrl(file));

    expect(result.current.previewUrl).toBe('blob:preview-1');
    expect(revokeObjectURL).not.toHaveBeenCalled();

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
  });

  it('revokes the old URL when the file changes', () => {
    const first = pngFile('a.png');
    const second = pngFile('b.png');
    const { result, rerender } = renderHook(({ file }) => useFilePreviewUrl(file), {
      initialProps: { file: first },
    });

    rerender({ file: second });

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    expect(result.current.previewUrl).toBe('blob:preview-2');
  });

  it('makes no URL for a non-image or a missing file', () => {
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    const { result: forPdf } = renderHook(() => useFilePreviewUrl(pdf));
    const { result: forNothing } = renderHook(() => useFilePreviewUrl(undefined));

    expect(forPdf.current.previewUrl).toBeNull();
    expect(forNothing.current.previewUrl).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('makes no URL for an image past the decode cap and asks for the type icon', () => {
    const huge = pngFile('huge.png');
    Object.defineProperty(huge, 'size', { value: FILE_LIBRARY_LOCAL_PREVIEW_MAX_BYTES + 1 });
    const { result } = renderHook(() => useFilePreviewUrl(huge));

    expect(result.current.previewUrl).toBeNull();
    expect(result.current.showFallbackIcon).toBe(true);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('still previews an image exactly at the cap', () => {
    const edge = pngFile('edge.png');
    Object.defineProperty(edge, 'size', { value: FILE_LIBRARY_LOCAL_PREVIEW_MAX_BYTES });
    const { result } = renderHook(() => useFilePreviewUrl(edge));

    expect(result.current.previewUrl).toBe('blob:preview-1');
    expect(result.current.showFallbackIcon).toBe(false);
  });

  it('drops the preview and asks for the type icon when the browser cannot decode it', () => {
    const file = pngFile('photo.heic');
    const { result } = renderHook(() => useFilePreviewUrl(file));
    expect(result.current.showFallbackIcon).toBe(false);

    act(() => result.current.handleError());

    expect(result.current.previewUrl).toBeNull();
    expect(result.current.showFallbackIcon).toBe(true);
  });

  it('forgets a decode failure when the file changes', () => {
    const first = pngFile('a.heic');
    const second = pngFile('b.png');
    const { result, rerender } = renderHook(({ file }) => useFilePreviewUrl(file), {
      initialProps: { file: first },
    });
    act(() => result.current.handleError());

    rerender({ file: second });

    expect(result.current.showFallbackIcon).toBe(false);
    expect(result.current.previewUrl).toBe('blob:preview-2');
  });

  it('never asks for the icon on a non-image: its tile has its own mark', () => {
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    const { result } = renderHook(() => useFilePreviewUrl(pdf));

    expect(result.current.showFallbackIcon).toBe(false);
  });
});
