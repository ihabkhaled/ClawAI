import { describe, expect, it } from 'vitest';

import { ArchiveTreeNodeKind } from '@/enums/archive-tree-node-kind.enum';
import type { ArchiveEntry, ArchiveTreeFolderNode } from '@/types/archive.types';
import {
  archiveTreeIndentStyle,
  buildArchiveTree,
  collectArchiveFolderKeys,
} from '@/utilities/archive-tree.utility';

function entry(archivePath: string, overrides: Partial<ArchiveEntry> = {}): ArchiveEntry {
  return {
    archivePath,
    sizeBytes: 10,
    status: 'included',
    detail: null,
    childFileId: `id:${archivePath}`,
    mimeType: 'text/plain',
    childCount: 0,
    ...overrides,
  };
}

describe('buildArchiveTree', () => {
  it('turns flat paths into nested folders, folders before files, both sorted', () => {
    const tree = buildArchiveTree([
      entry('readme.txt'),
      entry('docs/intro.md'),
      entry('docs/api/a.md'),
      entry('assets/logo.png'),
    ]);

    expect(tree.map((node) => [node.kind, node.name])).toEqual([
      ['folder', 'assets'],
      ['folder', 'docs'],
      ['file', 'readme.txt'],
    ]);

    const docs = tree[1] as ArchiveTreeFolderNode;
    expect(docs.children.map((node) => node.name)).toEqual(['api', 'intro.md']);
    expect(docs.fileCount).toBe(2);
  });

  it('sorts names numerically so "page-2" comes before "page-10"', () => {
    const tree = buildArchiveTree([entry('page-10.txt'), entry('page-2.txt')]);
    expect(tree.map((node) => node.name)).toEqual(['page-2.txt', 'page-10.txt']);
  });

  it('ignores empty path segments instead of producing a nameless folder', () => {
    const tree = buildArchiveTree([entry('./docs//intro.md')]);
    expect(tree).toHaveLength(1);
    const docs = tree[0] as ArchiveTreeFolderNode;
    expect(docs.name).toBe('docs');
    expect(docs.children[0]?.name).toBe('intro.md');
  });

  it('gives every folder a unique key derived from its full path', () => {
    const tree = buildArchiveTree([entry('a/x.txt'), entry('b/x.txt')]);
    const keys = collectArchiveFolderKeys(tree);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(['a', 'b']);
  });

  it('counts files in nested folders toward every ancestor', () => {
    const tree = buildArchiveTree([entry('a/b/c/one.txt'), entry('a/b/two.txt')]);
    const a = tree[0] as ArchiveTreeFolderNode;
    expect(a.fileCount).toBe(2);
    const b = a.children[0] as ArchiveTreeFolderNode;
    expect(b.fileCount).toBe(2);
  });

  it('keeps two entries with the same path as separate file nodes', () => {
    const tree = buildArchiveTree([entry('dup.txt'), entry('dup.txt')]);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.kind).toBe(ArchiveTreeNodeKind.File);
    expect(tree[0]?.key).not.toBe(tree[1]?.key);
  });
});

describe('archiveTreeIndentStyle', () => {
  it('uses a logical inline-start property so it mirrors under RTL', () => {
    expect(archiveTreeIndentStyle(0)).toEqual({ paddingInlineStart: '0.25rem' });
    expect(archiveTreeIndentStyle(2)).toEqual({ paddingInlineStart: '2.25rem' });
  });
});
