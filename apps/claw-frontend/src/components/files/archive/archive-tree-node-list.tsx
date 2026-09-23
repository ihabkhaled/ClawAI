import { ArchiveTreeNodeKind } from '@/enums/archive-tree-node-kind.enum';
import type { ArchiveTreeNodeListProps } from '@/types/archive.types';

import { ArchiveTreeFileRow } from './archive-tree-file-row';
import { ArchiveTreeFolderRow } from './archive-tree-folder-row';

// Renders one level of the tree and recurses into open folders. Recursion stays
// inside this one component so no two files import each other.
export function ArchiveTreeNodeList({
  nodes,
  depth,
  ancestorIds,
  selection,
  isFolderExpanded,
  onToggleFolder,
  t,
}: ArchiveTreeNodeListProps): React.ReactElement {
  return (
    <ul className="min-w-0">
      {nodes.map((node) => (
        <li key={node.key} className="min-w-0">
          {node.kind === ArchiveTreeNodeKind.Folder ? (
            <>
              <ArchiveTreeFolderRow
                node={node}
                depth={depth}
                expanded={isFolderExpanded(node.key)}
                onToggle={onToggleFolder}
                t={t}
              />
              {isFolderExpanded(node.key) ? (
                <ArchiveTreeNodeList
                  nodes={node.children}
                  depth={depth + 1}
                  ancestorIds={ancestorIds}
                  selection={selection}
                  isFolderExpanded={isFolderExpanded}
                  onToggleFolder={onToggleFolder}
                  t={t}
                />
              ) : null}
            </>
          ) : (
            <ArchiveTreeFileRow
              node={node}
              depth={depth}
              ancestorIds={ancestorIds}
              selection={selection}
              t={t}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
