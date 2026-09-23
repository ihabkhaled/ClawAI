import {
  ARCHIVE_PATH_SEPARATOR,
  ARCHIVE_TREE_BASE_INDENT_REM,
  ARCHIVE_TREE_INDENT_REM,
} from '@/constants/archive.constants';
import { ArchiveTreeNodeKind } from '@/enums/archive-tree-node-kind.enum';
import type {
  ArchiveEntry,
  ArchiveTreeBuilderFolder,
  ArchiveTreeFolderNode,
  ArchiveTreeIndentStyle,
  ArchiveTreeNode,
} from '@/types/archive.types';

/**
 * Folders from flat entry paths: "docs/api/a.md" becomes docs → api → a.md.
 * Folders sort before files, both by name with numeric awareness ("2" < "10").
 * Empty segments ("a//b", a leading "./") are ignored rather than shown as
 * nameless folders.
 */
export function buildArchiveTree(entries: readonly ArchiveEntry[]): ArchiveTreeNode[] {
  const root = createFolder('', '');
  for (const [index, entry] of entries.entries()) {
    const segments = entry.archivePath
      .split(ARCHIVE_PATH_SEPARATOR)
      .filter((segment) => segment.length > 0 && segment !== '.');
    const name = segments.pop() ?? entry.archivePath;
    let folder = root;
    for (const segment of segments) {
      folder = childFolder(folder, segment);
    }
    folder.files.push({
      kind: ArchiveTreeNodeKind.File,
      key: `${entry.archivePath}#${String(index)}`,
      name,
      entry,
    });
  }
  return finalizeFolder(root).children;
}

/** Every folder key in the tree, for expanding a small archive all at once. */
export function collectArchiveFolderKeys(nodes: readonly ArchiveTreeNode[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.kind === ArchiveTreeNodeKind.Folder) {
      keys.push(node.key, ...collectArchiveFolderKeys(node.children));
    }
  }
  return keys;
}

/** Nesting indent as a logical property, so it mirrors under `dir="rtl"`. */
export function archiveTreeIndentStyle(depth: number): ArchiveTreeIndentStyle {
  return {
    paddingInlineStart: `${String(ARCHIVE_TREE_BASE_INDENT_REM + depth * ARCHIVE_TREE_INDENT_REM)}rem`,
  };
}

function createFolder(key: string, name: string): ArchiveTreeBuilderFolder {
  return { key, name, folders: new Map(), files: [] };
}

function childFolder(parent: ArchiveTreeBuilderFolder, segment: string): ArchiveTreeBuilderFolder {
  const existing = parent.folders.get(segment);
  if (existing !== undefined) {
    return existing;
  }
  const key =
    parent.key.length === 0 ? segment : `${parent.key}${ARCHIVE_PATH_SEPARATOR}${segment}`;
  const created = createFolder(key, segment);
  parent.folders.set(segment, created);
  return created;
}

function compareNames(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

function finalizeFolder(folder: ArchiveTreeBuilderFolder): ArchiveTreeFolderNode {
  const folders = [...folder.folders.values()].map(finalizeFolder).sort(compareNames);
  const files = [...folder.files].sort(compareNames);
  return {
    kind: ArchiveTreeNodeKind.Folder,
    key: folder.key,
    name: folder.name,
    children: [...folders, ...files],
    fileCount: files.length + folders.reduce((sum, child) => sum + child.fileCount, 0),
  };
}
