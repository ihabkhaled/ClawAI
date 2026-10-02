import { describe, it, expect } from 'vitest';

import { extractFilesFromDataTransfer } from '@/utilities/data-transfer.utility';

function makeFile(name: string): File {
  return new File(['x'], name, { type: 'image/png' });
}

function makeDataTransfer(opts: {
  files?: File[];
  items?: Array<{ kind: string; file: File | null }>;
}): DataTransfer {
  const files = opts.files ?? [];
  const items = opts.items ?? [];
  return {
    files: files as unknown as FileList,
    items: items.map((i) => ({
      kind: i.kind,
      getAsFile: () => i.file,
    })) as unknown as DataTransferItemList,
  } as unknown as DataTransfer;
}

describe('extractFilesFromDataTransfer', () => {
  it('returns [] for null/undefined', () => {
    expect(extractFilesFromDataTransfer(null)).toEqual([]);
    expect(extractFilesFromDataTransfer(undefined)).toEqual([]);
  });

  it('extracts dropped files from the files list', () => {
    const a = makeFile('a.png');
    const result = extractFilesFromDataTransfer(makeDataTransfer({ files: [a] }));
    expect(result).toEqual([a]);
  });

  it('extracts screenshot images from items of kind file', () => {
    const img = makeFile('clip.png');
    const result = extractFilesFromDataTransfer(
      makeDataTransfer({ items: [{ kind: 'file', file: img }] }),
    );
    expect(result).toEqual([img]);
  });

  it('ignores non-file items (e.g. plain text)', () => {
    const result = extractFilesFromDataTransfer(
      makeDataTransfer({ items: [{ kind: 'string', file: null }] }),
    );
    expect(result).toEqual([]);
  });

  it('dedupes a file present in both items and files', () => {
    const f = makeFile('dup.png');
    const result = extractFilesFromDataTransfer(
      makeDataTransfer({ files: [f], items: [{ kind: 'file', file: f }] }),
    );
    expect(result).toEqual([f]);
  });

  it('does not double-count a pasted screenshot whose item yields a NEW File object each call', () => {
    // Real browsers: clipboardData.files[0] and items[0].getAsFile() are the same
    // pixels but different File instances, and getAsFile() returns a fresh one every time.
    const inFiles = makeFile('image.png');
    const dt = {
      files: [inFiles] as unknown as FileList,
      items: [
        { kind: 'file', getAsFile: () => makeFile('image.png') },
      ] as unknown as DataTransferItemList,
    } as unknown as DataTransfer;

    expect(extractFilesFromDataTransfer(dt)).toEqual([inFiles]);
  });

  it('keeps two different pasted files', () => {
    const a = makeFile('a.png');
    const b = makeFile('b.png');
    expect(extractFilesFromDataTransfer(makeDataTransfer({ files: [a, b] }))).toEqual([a, b]);
  });

  it('falls back to items only when files is empty (copied image)', () => {
    const a = makeFile('copied.png');
    const b = makeFile('copied2.png');
    expect(
      extractFilesFromDataTransfer(
        makeDataTransfer({
          items: [
            { kind: 'file', file: a },
            { kind: 'file', file: b },
          ],
        }),
      ),
    ).toEqual([a, b]);
  });
});
