import { ROUTES } from '@/constants';
import type {
  ThreadLineage,
  ThreadLineageBarProps,
  ThreadLineageEntry,
  ThreadLineageLink,
} from '@/types';

/** Resolves one lineage entry to a label and a destination. */
export function toLineageLink(entry: ThreadLineageEntry, untitledLabel: string): ThreadLineageLink {
  return { id: entry.id, label: entry.title ?? untitledLabel, href: ROUTES.CHAT_THREAD(entry.id) };
}

/**
 * The strip's props from a lineage response. Hidden for a thread that is
 * neither a branch nor has branches — the common case — so a normal
 * conversation spends no height on it.
 */
export function buildLineageBarProps(
  lineage: ThreadLineage | null,
  labels: Pick<
    ThreadLineageBarProps,
    'branchedFromLabel' | 'sourceDeletedLabel' | 'branchesLabel'
  > & {
    untitledLabel: string;
  },
): ThreadLineageBarProps {
  const parent = lineage?.parent ? toLineageLink(lineage.parent, labels.untitledLabel) : null;
  const branches = (lineage?.branches ?? []).map((entry) =>
    toLineageLink(entry, labels.untitledLabel),
  );
  const parentDeleted = lineage?.parentDeleted ?? false;
  return {
    visible: parent !== null || parentDeleted || branches.length > 0,
    parent,
    parentDeleted,
    branches,
    branchedFromLabel: labels.branchedFromLabel,
    sourceDeletedLabel: labels.sourceDeletedLabel,
    branchesLabel: labels.branchesLabel,
  };
}
