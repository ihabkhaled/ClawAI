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
});
