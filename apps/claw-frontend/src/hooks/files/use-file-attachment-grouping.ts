import { useCallback, useMemo, useState } from 'react';

import type {
  FileAttachmentGroup,
  UploadedFile,
  UseFileAttachmentGroupingReturn,
} from '@/types';

export const useFileAttachmentGrouping = (
  files: UploadedFile[],
): UseFileAttachmentGroupingReturn => {
  const [expandedParentIds, setExpandedParentIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const { groups, standalone, hasGroups } = useMemo(() => {
    const fileById = new Map<string, UploadedFile>();
    for (const file of files) {
      fileById.set(file.id, file);
    }

    const childrenByParent = new Map<string, UploadedFile[]>();
    const standaloneFiles: UploadedFile[] = [];

    for (const file of files) {
      const parentId = file.parentFileId ?? null;
      if (parentId !== null && fileById.has(parentId)) {
        const list = childrenByParent.get(parentId) ?? [];
        list.push(file);
        childrenByParent.set(parentId, list);
      }
    }

    const groupList: FileAttachmentGroup[] = [];

    for (const file of files) {
      const isChildOfKnownParent =
        file.parentFileId !== null &&
        file.parentFileId !== undefined &&
        fileById.has(file.parentFileId);

      if (isChildOfKnownParent) {
        continue;
      }

      const children = childrenByParent.get(file.id);
      if (children !== undefined && children.length > 0) {
        groupList.push({ parent: file, children });
      } else {
        standaloneFiles.push(file);
      }
    }

    return {
      groups: groupList,
      standalone: standaloneFiles,
      hasGroups: groupList.length > 0,
    };
  }, [files]);

  const toggleParentExpansion = useCallback((parentId: string): void => {
    setExpandedParentIds((previous) => {
      const next = new Set(previous);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  }, []);

  const isParentExpanded = useCallback(
    (parentId: string): boolean => expandedParentIds.has(parentId),
    [expandedParentIds],
  );

  return {
    groups,
    standalone,
    hasGroups,
    expandedParentIds,
    toggleParentExpansion,
    isParentExpanded,
  };
};
