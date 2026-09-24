import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFileAttachmentPickerState } from '@/hooks/chat/use-file-attachment-picker-state';

// Regression for the live QA finding on 2026-09-24: the paperclip picker's
// "Upload new file" button and its own drop zone used to call a separate,
// un-chunked useUploadFile mutation directly, bypassing the chunked/antivirus
// pipeline (useComposerAttachments / useChunkedUpload) that paste, the
// composer-body dropzone and the recorder already went through. A 30MB file
// attached via the paperclip picker sent a single un-chunked
// POST /files/upload with no percent/ETA/speed readout. This hook must now
// delegate every ingestion path to the `ingestFiles` callback the composer
// passes in, so all four entry points share one pipeline.
function makeFile(name: string, bytes = 10): File {
  return new File([new Uint8Array(bytes)], name, { type: 'text/plain' });
}

describe('useFileAttachmentPickerState', () => {
  it('routes a file chosen via the file input through ingestFiles', () => {
    const ingestFiles = vi.fn();
    const { result } = renderHook(() =>
      useFileAttachmentPickerState({ selectedFileIds: [], ingestFiles }),
    );

    const file = makeFile('report.pdf');
    const fileList = { 0: file, length: 1, item: () => file } as unknown as FileList;
    const event = {
      target: { files: fileList },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleInputChange(event);
    });

    expect(ingestFiles).toHaveBeenCalledTimes(1);
    expect(ingestFiles).toHaveBeenCalledWith(fileList);
  });

  it('routes a dropped file through ingestFiles', () => {
    const ingestFiles = vi.fn();
    const { result } = renderHook(() =>
      useFileAttachmentPickerState({ selectedFileIds: [], ingestFiles }),
    );

    const file = makeFile('big-upload.bin', 30 * 1024 * 1024);
    const fileList = { 0: file, length: 1, item: () => file } as unknown as FileList;
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: { files: fileList },
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDrop(event);
    });

    expect(ingestFiles).toHaveBeenCalledTimes(1);
    expect(ingestFiles).toHaveBeenCalledWith(fileList);
  });

  it('does not call ingestFiles when the input change carries no file', () => {
    const ingestFiles = vi.fn();
    const { result } = renderHook(() =>
      useFileAttachmentPickerState({ selectedFileIds: [], ingestFiles }),
    );

    const emptyList = { length: 0, item: () => null } as unknown as FileList;
    const event = {
      target: { files: emptyList },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleInputChange(event);
    });

    expect(ingestFiles).not.toHaveBeenCalled();
  });
});
