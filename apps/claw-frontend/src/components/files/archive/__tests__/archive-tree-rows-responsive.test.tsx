import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ArchiveTreeFileRow } from '@/components/files/archive/archive-tree-file-row';
import { ArchiveTreeFolderRow } from '@/components/files/archive/archive-tree-folder-row';
import { ArchiveTreeNodeKind } from '@/enums/archive-tree-node-kind.enum';
import type { ArchiveTreeFileNode, ArchiveTreeFolderNode } from '@/types/archive.types';

/**
 * Same discipline as composer-controls-responsive.test.tsx: assert on CLASSES,
 * because jsdom does not lay out, and every guard here is pointer-based
 * (`touch:`) rather than width-based (`max-md:`) — a phone in landscape clears
 * 768px and would get desktop sizing from a width guard.
 */
const t = (key: string): string => key;

describe('archive tree rows fit a small screen', () => {
  it('gives the folder toggle a coarse-pointer hit area', () => {
    const node: ArchiveTreeFolderNode = {
      kind: ArchiveTreeNodeKind.Folder,
      key: 'docs',
      name: 'docs',
      children: [],
      fileCount: 3,
    };
    render(
      <ArchiveTreeFolderRow node={node} depth={0} expanded={false} onToggle={vi.fn()} t={t} />,
    );
    const button = screen.getByRole('button');
    expect(button.className).toContain('touch:min-h-11');
    expect(button.className).not.toContain('max-md:');
  });

  it('wraps a file row instead of overflowing when the status badge grows', () => {
    const node: ArchiveTreeFileNode = {
      kind: ArchiveTreeNodeKind.File,
      key: 'a.txt#0',
      name: 'a.txt',
      entry: {
        archivePath: 'a.txt',
        sizeBytes: 10,
        status: 'included',
        detail: null,
        childFileId: 'c1',
        mimeType: 'text/plain',
        childCount: 0,
      },
    };
    render(<ArchiveTreeFileRow node={node} depth={0} ancestorIds={[]} t={t} />);
    const row = screen.getByTestId('archive-tree-file');
    expect(row.className).toContain('flex-wrap');
    expect(row.className).not.toContain('overflow-hidden');
  });

  it('shows no checkbox for a skipped entry — there is nothing to attach', () => {
    const node: ArchiveTreeFileNode = {
      kind: ArchiveTreeNodeKind.File,
      key: 'locked.txt#0',
      name: 'locked.txt',
      entry: {
        archivePath: 'locked.txt',
        sizeBytes: 10,
        status: 'skipped-encrypted',
        detail: null,
        childFileId: null,
        mimeType: null,
        childCount: 0,
      },
    };
    render(
      <ArchiveTreeFileRow
        node={node}
        depth={0}
        ancestorIds={[]}
        selection={{ isSelected: () => false, onToggle: vi.fn() }}
        t={t}
      />,
    );
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
