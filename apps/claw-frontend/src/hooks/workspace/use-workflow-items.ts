import { useState } from 'react';

import type { UseWorkflowItemsResult } from '../../types/workspace-workflow.types';
import type { WorkspaceObject } from '../../types/workspace.types';

export function useWorkflowItems(): UseWorkflowItemsResult {
  const [selectedItems, setSelectedItems] = useState<WorkspaceObject[]>([]);

  const handleAddItem = (item: WorkspaceObject): void => {
    setSelectedItems((prev) => {
      if (prev.some((i) => i.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  const handleRemoveItem = (id: string): void => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearItems = (): void => {
    setSelectedItems([]);
  };

  const combinedContext = selectedItems
    .map((item) => `[${item.provider} — ${item.title}]\n${item.content ?? item.title}`)
    .join('\n\n---\n\n');

  return { selectedItems, handleAddItem, handleRemoveItem, handleClearItems, combinedContext };
}
