import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { vi } from 'vitest';
import { ChunkedUploadManager } from '../chunked-upload.manager';

// Real disk (a fresh temp dir per test), real fs — only AppConfig is stubbed
// so FILE_STORAGE_PATH points at that temp dir. This proves reassembly
// integrity (byte-for-byte, out-of-order chunk arrival, resume-after-restart
// via getStatus) against the actual file-storage utility contract, not a mock.
let storageRoot: string;

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn(() => ({ FILE_STORAGE_PATH: storageRoot })) },
}));

describe('ChunkedUploadManager', () => {
  let manager: ChunkedUploadManager;

  beforeEach(() => {
    storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chunked-upload-'));
    manager = new ChunkedUploadManager();
  });

  afterEach(() => {
    fs.rmSync(storageRoot, { recursive: true, force: true });
  });

  it('reassembles chunks uploaded in order into the exact original bytes', () => {
    const part1 = Buffer.from('hello ');
    const part2 = Buffer.from('world');
    const session = manager.init('user-1', {
      filename: 'note.webm',
      mimeType: 'audio/webm',
      sizeBytes: part1.length + part2.length,
      totalChunks: 2,
    });

    manager.receiveChunk('user-1', session.uploadId, 0, part1.toString('base64'));
    manager.receiveChunk('user-1', session.uploadId, 1, part2.toString('base64'));

    const { buffer, manifest } = manager.reassemble('user-1', session.uploadId);
    expect(buffer.toString()).toBe('hello world');
    expect(manifest.sizeBytes).toBe(11);
  });

  it('reassembles correctly when chunks arrive out of order (resume mid-session)', () => {
    const part1 = Buffer.from('AAAA');
    const part2 = Buffer.from('BBBB');
    const part3 = Buffer.from('CCCC');
    const session = manager.init('user-1', {
      filename: 'clip.webm',
      mimeType: 'video/webm',
      sizeBytes: 12,
      totalChunks: 3,
    });

    manager.receiveChunk('user-1', session.uploadId, 2, part3.toString('base64'));
    manager.receiveChunk('user-1', session.uploadId, 0, part1.toString('base64'));
    manager.receiveChunk('user-1', session.uploadId, 1, part2.toString('base64'));

    const { buffer } = manager.reassemble('user-1', session.uploadId);
    expect(buffer.toString()).toBe('AAAABBBBCCCC');
  });

  it('re-uploading the same chunk index is idempotent and does not duplicate it in the manifest', () => {
    const chunk = Buffer.from('data');
    const session = manager.init('user-1', {
      filename: 'a.webm',
      mimeType: 'audio/webm',
      sizeBytes: 4,
      totalChunks: 1,
    });

    manager.receiveChunk('user-1', session.uploadId, 0, chunk.toString('base64'));
    const status = manager.receiveChunk('user-1', session.uploadId, 0, chunk.toString('base64'));

    expect(status.receivedChunks).toEqual([0]);
    expect(status.complete).toBe(true);
  });

  it('getStatus lets a client resume by reporting exactly which chunks already landed', () => {
    const session = manager.init('user-1', {
      filename: 'a.webm',
      mimeType: 'audio/webm',
      sizeBytes: 8,
      totalChunks: 2,
    });
    manager.receiveChunk('user-1', session.uploadId, 1, Buffer.from('bbbb').toString('base64'));

    const status = manager.getStatus('user-1', session.uploadId);
    expect(status.receivedChunks).toEqual([1]);
    expect(status.complete).toBe(false);
  });

  it('rejects a chunk index outside the declared session bounds', () => {
    const session = manager.init('user-1', {
      filename: 'a.webm',
      mimeType: 'audio/webm',
      sizeBytes: 4,
      totalChunks: 1,
    });
    expect(() =>
      manager.receiveChunk('user-1', session.uploadId, 5, Buffer.from('x').toString('base64')),
    ).toThrow(/out of range|outside session bounds/i);
  });

  it('refuses to reassemble a session another user owns, same as a missing session', () => {
    const session = manager.init('user-1', {
      filename: 'a.webm',
      mimeType: 'audio/webm',
      sizeBytes: 4,
      totalChunks: 1,
    });
    manager.receiveChunk('user-1', session.uploadId, 0, Buffer.from('data').toString('base64'));

    expect(() => manager.reassemble('user-2', session.uploadId)).toThrow(/not found/i);
    expect(() => manager.getStatus('user-2', session.uploadId)).toThrow(/not found/i);
  });

  it('refuses to reassemble an incomplete session', () => {
    const session = manager.init('user-1', {
      filename: 'a.webm',
      mimeType: 'audio/webm',
      sizeBytes: 8,
      totalChunks: 2,
    });
    manager.receiveChunk('user-1', session.uploadId, 0, Buffer.from('aaaa').toString('base64'));

    expect(() => manager.reassemble('user-1', session.uploadId)).toThrow(/missing/i);
  });

  it('rejects reassembly when the reassembled size does not match the declared size', () => {
    const session = manager.init('user-1', {
      filename: 'a.webm',
      mimeType: 'audio/webm',
      sizeBytes: 999,
      totalChunks: 1,
    });
    manager.receiveChunk('user-1', session.uploadId, 0, Buffer.from('short').toString('base64'));

    expect(() => manager.reassemble('user-1', session.uploadId)).toThrow(
      /does not match declared size/i,
    );
  });

  it('cleanup removes the session directory so a completed/aborted session leaves nothing behind', () => {
    const session = manager.init('user-1', {
      filename: 'a.webm',
      mimeType: 'audio/webm',
      sizeBytes: 4,
      totalChunks: 1,
    });
    manager.receiveChunk('user-1', session.uploadId, 0, Buffer.from('data').toString('base64'));
    manager.cleanup(session.uploadId);

    expect(() => manager.getStatus('user-1', session.uploadId)).toThrow(/not found/i);
  });
  describe('abort (DELETE files/upload/chunked/:uploadId)', () => {
    const openSession = (userId = 'user-1') =>
      manager.init(userId, {
        filename: 'clip.webm',
        mimeType: 'video/webm',
        sizeBytes: 8,
        totalChunks: 2,
      });

    it("frees the owner's temp chunks at once and answers aborted: true", () => {
      const session = openSession();
      manager.receiveChunk('user-1', session.uploadId, 0, Buffer.from('AAAA').toString('base64'));
      const dir = path.join(storageRoot, '.chunk-sessions', session.uploadId);
      expect(fs.existsSync(dir)).toBe(true);

      expect(manager.abort('user-1', session.uploadId)).toEqual({
        uploadId: session.uploadId,
        aborted: true,
      });
      expect(fs.existsSync(dir)).toBe(false);
    });

    it('is idempotent: a second abort answers aborted: false, never throws', () => {
      const session = openSession();
      manager.abort('user-1', session.uploadId);

      expect(manager.abort('user-1', session.uploadId)).toEqual({
        uploadId: session.uploadId,
        aborted: false,
      });
    });

    it("leaves another user's session untouched and answers like a missing one", () => {
      const session = openSession('user-1');
      manager.receiveChunk('user-1', session.uploadId, 0, Buffer.from('AAAA').toString('base64'));

      expect(manager.abort('user-2', session.uploadId)).toEqual({
        uploadId: session.uploadId,
        aborted: false,
      });
      expect(manager.getStatus('user-1', session.uploadId).receivedChunks).toEqual([0]);
    });

    it('a chunk that arrives after the abort gets the ordinary not-found', () => {
      const session = openSession();
      manager.abort('user-1', session.uploadId);

      expect(() =>
        manager.receiveChunk('user-1', session.uploadId, 1, Buffer.from('BBBB').toString('base64')),
      ).toThrow(/not found/i);
    });
  });
});
