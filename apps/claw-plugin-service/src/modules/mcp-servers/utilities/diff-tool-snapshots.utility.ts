import {
  type SnapshotTool,
  type StoredToolIdentity,
  type ToolDiff,
} from '../types/mcp-tool-snapshot.types';

/** What changed between the approved tools and a fresh tools/list, by the server's own names. */
export function diffToolSnapshots(
  approved: readonly StoredToolIdentity[],
  fresh: readonly SnapshotTool[],
): ToolDiff {
  const before = new Map(approved.map((tool) => [tool.name, tool.schemaHash]));
  const after = new Map(fresh.map((tool) => [tool.name, tool.schemaHash]));
  return {
    added: fresh.filter((tool) => !before.has(tool.name)).map((tool) => tool.localName),
    removed: approved.filter((tool) => !after.has(tool.name)).map((tool) => tool.localName),
    changed: fresh
      .filter((tool) => before.has(tool.name) && before.get(tool.name) !== tool.schemaHash)
      .map((tool) => tool.localName),
  };
}

export function isEmptyDiff(diff: ToolDiff): boolean {
  return diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0;
}
