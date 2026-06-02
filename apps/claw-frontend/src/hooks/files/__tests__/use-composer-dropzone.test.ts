import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useComposerDropzone } from '@/hooks/files/use-composer-dropzone';

function makeFile(name: string): File {
  return new File(['x'], name, { type: 'image/png' });
}

function dragEvent(types: string[], files: File[]): React.DragEvent {
  return {
    preventDefault: vi.fn(),
    dataTransfer: {
      types,
      files: files as unknown as FileList,
      items: files.map((f) => ({ kind: 'file', getAsFile: () => f })),
    },
  } as unknown as React.DragEvent;
}

describe('useComposerDropzone', () => {
  it('emits files on drop and clears drag-active', () => {
    const onFiles = vi.fn();
    const { result } = renderHook(() => useComposerDropzone({ onFiles }));
    const file = makeFile('a.png');

    act(() => {
      result.current.handleDragEnter(dragEvent(['Files'], [file]));
    });
    expect(result.current.isDragActive).toBe(true);

    act(() => {
      result.current.handleDrop(dragEvent(['Files'], [file]));
    });
    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(result.current.isDragActive).toBe(false);
  });

  it('does not activate the overlay for non-file drags', () => {
    const onFiles = vi.fn();
    const { result } = renderHook(() => useComposerDropzone({ onFiles }));
    act(() => {
      result.current.handleDragEnter(dragEvent(['text/plain'], []));
    });
    expect(result.current.isDragActive).toBe(false);
  });

  it('emits files on paste and prevents default only when files are present', () => {
    const onFiles = vi.fn();
    const { result } = renderHook(() => useComposerDropzone({ onFiles }));
    const file = makeFile('clip.png');
    const preventDefault = vi.fn();
    const pasteEvent = {
      preventDefault,
      clipboardData: {
        types: ['Files'],
        files: [file] as unknown as FileList,
        items: [{ kind: 'file', getAsFile: () => file }],
      },
    } as unknown as React.ClipboardEvent;

    act(() => {
      result.current.handlePaste(pasteEvent);
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('ignores a text-only paste (lets the textarea handle it)', () => {
    const onFiles = vi.fn();
    const { result } = renderHook(() => useComposerDropzone({ onFiles }));
    const preventDefault = vi.fn();
    const pasteEvent = {
      preventDefault,
      clipboardData: { types: ['text/plain'], files: [] as unknown as FileList, items: [] },
    } as unknown as React.ClipboardEvent;

    act(() => {
      result.current.handlePaste(pasteEvent);
    });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const onFiles = vi.fn();
    const { result } = renderHook(() => useComposerDropzone({ onFiles, disabled: true }));
    const file = makeFile('a.png');
    act(() => {
      result.current.handleDrop(dragEvent(['Files'], [file]));
    });
    expect(onFiles).not.toHaveBeenCalled();
  });
});
