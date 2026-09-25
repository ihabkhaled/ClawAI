import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChunkedUpload } from '@/hooks/files/use-chunked-upload';
import { filesRepository } from '@/repositories/files/files.repository';

// Small, fast bounds so retry/backoff tests don't sleep real seconds.
vi.mock('@/constants/chunked-upload.constants', () => ({
  CHUNKED_UPLOAD_THRESHOLD_BYTES: 5,
  CHUNKED_UPLOAD_CHUNK_BYTES: 10,
  CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK: 3,
  CHUNKED_UPLOAD_RETRY_BASE_MS: 1,
  CHUNKED_UPLOAD_RETRY_MAX_MS: 2,
  UPLOAD_PROGRESS_TICK_MS: 100000, // effectively off — assertions read emitProgress-driven state
}));

vi.mock('@/repositories/files/files.repository', () => ({
  filesRepository: {
    uploadFile: vi.fn(),
    initChunkedUpload: vi.fn(),
    uploadChunk: vi.fn(),
    getChunkedUploadStatus: vi.fn(),
    completeChunkedUpload: vi.fn(),
    abortChunkedUpload: vi.fn(),
  },
}));

function smallFile(bytes: number, name = 'note.webm'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'audio/webm' });
}

describe('useChunkedUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads a file at or below the threshold through the single-shot endpoint', async () => {
    vi.mocked(filesRepository.uploadFile).mockResolvedValue({ id: 'file-1' } as never);
    const { result } = renderHook(() => useChunkedUpload());

    let fileId = '';
    await act(async () => {
      fileId = await result.current.upload(smallFile(3));
    });

    expect(fileId).toBe('file-1');
    expect(filesRepository.uploadFile).toHaveBeenCalledTimes(1);
    expect(filesRepository.initChunkedUpload).not.toHaveBeenCalled();
  });

  // Live bug (2026-09-24): the SAME "100% uploaded, 0:00 remaining" readout
  // was still rendering under the composer minutes later, across four
  // unrelated sends, because nothing ever cleared `progress` once an upload
  // settled — it just sat there as stale state until the next upload
  // overwrote it (and never cleared after the LAST upload of a session).
  it('clears progress back to null once a successful upload settles', async () => {
    vi.mocked(filesRepository.uploadFile).mockResolvedValue({ id: 'file-1' } as never);
    const { result } = renderHook(() => useChunkedUpload());

    await act(async () => {
      await result.current.upload(smallFile(3));
    });

    expect(result.current.progress).toBeNull();
    expect(result.current.isUploading).toBe(false);
  });

  it('clears progress back to null once a failed upload settles', async () => {
    vi.mocked(filesRepository.initChunkedUpload).mockResolvedValue({
      uploadId: 'up-fail',
      totalChunks: 1,
      receivedChunks: [],
      complete: false,
    });
    vi.mocked(filesRepository.uploadChunk).mockRejectedValue(new Error('always fails'));

    const { result } = renderHook(() => useChunkedUpload());
    await act(async () => {
      await expect(result.current.upload(smallFile(8))).rejects.toThrow();
    });

    expect(result.current.progress).toBeNull();
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).not.toBeNull();
  });

  it('chunks a file above the threshold and completes the session', async () => {
    vi.mocked(filesRepository.initChunkedUpload).mockResolvedValue({
      uploadId: 'up-1',
      totalChunks: 3,
      receivedChunks: [],
      complete: false,
    });
    vi.mocked(filesRepository.uploadChunk).mockResolvedValue({
      uploadId: 'up-1',
      totalChunks: 3,
      receivedChunks: [0],
      complete: false,
    });
    vi.mocked(filesRepository.completeChunkedUpload).mockResolvedValue({ id: 'file-2' } as never);

    const { result } = renderHook(() => useChunkedUpload());
    let fileId = '';
    await act(async () => {
      fileId = await result.current.upload(smallFile(25)); // 25 bytes / 10-byte chunks = 3 chunks
    });

    expect(fileId).toBe('file-2');
    expect(filesRepository.initChunkedUpload).toHaveBeenCalledTimes(1);
    expect(filesRepository.uploadChunk).toHaveBeenCalledTimes(3);
    expect(filesRepository.completeChunkedUpload).toHaveBeenCalledWith('up-1');
  });

  it('retries a failed chunk on a file large enough to be chunked, then succeeds', async () => {
    vi.mocked(filesRepository.initChunkedUpload).mockResolvedValue({
      uploadId: 'up-3',
      totalChunks: 1,
      receivedChunks: [],
      complete: false,
    });
    vi.mocked(filesRepository.uploadChunk)
      .mockRejectedValueOnce(new Error('blip 1'))
      .mockRejectedValueOnce(new Error('blip 2'))
      .mockResolvedValueOnce({
        uploadId: 'up-3',
        totalChunks: 1,
        receivedChunks: [0],
        complete: true,
      });
    vi.mocked(filesRepository.completeChunkedUpload).mockResolvedValue({ id: 'file-4' } as never);

    const { result } = renderHook(() => useChunkedUpload());
    let fileId = '';
    await act(async () => {
      fileId = await result.current.upload(smallFile(8)); // > threshold(5), <= chunkBytes(10): exactly 1 chunk
    });

    expect(fileId).toBe('file-4');
    // 2 failures + 1 success = 3 calls, within CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK (3).
    expect(filesRepository.uploadChunk).toHaveBeenCalledTimes(3);
  });

  it('gives up after the bounded retry ceiling — never retries forever', async () => {
    vi.mocked(filesRepository.initChunkedUpload).mockResolvedValue({
      uploadId: 'up-4',
      totalChunks: 1,
      receivedChunks: [],
      complete: false,
    });
    vi.mocked(filesRepository.uploadChunk).mockRejectedValue(new Error('always fails'));

    const { result } = renderHook(() => useChunkedUpload());
    await act(async () => {
      await expect(result.current.upload(smallFile(8))).rejects.toThrow();
    });

    // Exactly CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK attempts — bounded, not infinite.
    expect(filesRepository.uploadChunk).toHaveBeenCalledTimes(3);
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(filesRepository.completeChunkedUpload).not.toHaveBeenCalled();
  });

  it('resumes from the last successful chunk instead of restarting after a dropped session', async () => {
    vi.mocked(filesRepository.initChunkedUpload).mockResolvedValue({
      uploadId: 'up-5',
      totalChunks: 3,
      receivedChunks: [],
      complete: false,
    });
    // Chunk 0 lands, chunk 1 fails every attempt -> upload() rejects.
    vi.mocked(filesRepository.uploadChunk).mockImplementation((_uploadId, index) => {
      if (index === 0) {
        return Promise.resolve({
          uploadId: 'up-5',
          totalChunks: 3,
          receivedChunks: [0],
          complete: false,
        });
      }
      return Promise.reject(new Error('dropped'));
    });

    const { result } = renderHook(() => useChunkedUpload());
    const file = smallFile(25);
    await act(async () => {
      await expect(result.current.upload(file)).rejects.toThrow();
    });
    expect(filesRepository.initChunkedUpload).toHaveBeenCalledTimes(1);

    // Second attempt for the SAME file: resumes via getChunkedUploadStatus,
    // does not open a new session, and does not re-send chunk 0.
    vi.mocked(filesRepository.getChunkedUploadStatus).mockResolvedValue({
      uploadId: 'up-5',
      totalChunks: 3,
      receivedChunks: [0],
      complete: false,
    });
    vi.mocked(filesRepository.uploadChunk).mockClear();
    vi.mocked(filesRepository.uploadChunk).mockImplementation((_uploadId, index) =>
      Promise.resolve({
        uploadId: 'up-5',
        totalChunks: 3,
        receivedChunks: [0, 1, 2].slice(0, index + 1),
        complete: index === 2,
      }),
    );
    vi.mocked(filesRepository.completeChunkedUpload).mockResolvedValue({ id: 'file-5' } as never);

    await act(async () => {
      await result.current.upload(file);
    });

    expect(filesRepository.initChunkedUpload).toHaveBeenCalledTimes(1); // still just once
    expect(filesRepository.getChunkedUploadStatus).toHaveBeenCalledWith('up-5');
    // Only indices 1 and 2 were (re-)sent on the resumed pass — index 0 was
    // already on the server, per the resumed status.
    const secondPassIndexes = vi
      .mocked(filesRepository.uploadChunk)
      .mock.calls.map((call) => call[1]);
    expect(secondPassIndexes).not.toContain(0);
  });
  describe('abort (the user takes the file back mid-upload)', () => {
    it('sends no further chunk, deletes the server session once, and reports no error', async () => {
      vi.mocked(filesRepository.initChunkedUpload).mockResolvedValue({
        uploadId: 'up-abort',
        totalChunks: 3,
        receivedChunks: [],
        complete: false,
      });
      vi.mocked(filesRepository.abortChunkedUpload).mockResolvedValue({
        uploadId: 'up-abort',
        aborted: true,
      });
      const controller = new AbortController();
      // Chunk 0 lands, and the user removes the tile while it is answering.
      vi.mocked(filesRepository.uploadChunk).mockImplementation(() => {
        controller.abort();
        return Promise.resolve({
          uploadId: 'up-abort',
          totalChunks: 3,
          receivedChunks: [0],
          complete: false,
        });
      });

      const { result } = renderHook(() => useChunkedUpload());
      await act(async () => {
        await expect(
          result.current.upload(smallFile(25), { signal: controller.signal }),
        ).rejects.toThrow('Upload aborted');
      });

      expect(filesRepository.uploadChunk).toHaveBeenCalledTimes(1);
      expect(filesRepository.completeChunkedUpload).not.toHaveBeenCalled();
      expect(filesRepository.abortChunkedUpload).toHaveBeenCalledTimes(1);
      expect(filesRepository.abortChunkedUpload).toHaveBeenCalledWith('up-abort');
      expect(result.current.error).toBeNull();
      expect(result.current.isUploading).toBe(false);
    });

    it('does not retry or back off a chunk request the abort cancelled', async () => {
      vi.mocked(filesRepository.initChunkedUpload).mockResolvedValue({
        uploadId: 'up-abort-2',
        totalChunks: 1,
        receivedChunks: [],
        complete: false,
      });
      vi.mocked(filesRepository.abortChunkedUpload).mockResolvedValue({
        uploadId: 'up-abort-2',
        aborted: true,
      });
      const controller = new AbortController();
      vi.mocked(filesRepository.uploadChunk).mockImplementation(() => {
        controller.abort();
        return Promise.reject(new Error('canceled'));
      });

      const { result } = renderHook(() => useChunkedUpload());
      await act(async () => {
        await expect(
          result.current.upload(smallFile(8), { signal: controller.signal }),
        ).rejects.toThrow('Upload aborted');
      });

      // One attempt, not CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK (3).
      expect(filesRepository.uploadChunk).toHaveBeenCalledTimes(1);
      expect(filesRepository.abortChunkedUpload).toHaveBeenCalledWith('up-abort-2');
    });

    it('passes the signal to every request so the one in flight is cancelled too', async () => {
      vi.mocked(filesRepository.uploadFile).mockResolvedValue({ id: 'file-9' } as never);
      const controller = new AbortController();
      const { result } = renderHook(() => useChunkedUpload());

      await act(async () => {
        await result.current.upload(smallFile(3), { signal: controller.signal });
      });

      expect(vi.mocked(filesRepository.uploadFile).mock.calls[0]?.[1]).toBe(controller.signal);
    });

    it('an upload aborted before it starts sends nothing at all', async () => {
      const controller = new AbortController();
      controller.abort();
      const { result } = renderHook(() => useChunkedUpload());

      await act(async () => {
        await expect(
          result.current.upload(smallFile(25), { signal: controller.signal }),
        ).rejects.toThrow('Upload aborted');
      });

      expect(filesRepository.initChunkedUpload).not.toHaveBeenCalled();
      expect(filesRepository.uploadFile).not.toHaveBeenCalled();
      expect(filesRepository.abortChunkedUpload).not.toHaveBeenCalled();
    });
  });
});
