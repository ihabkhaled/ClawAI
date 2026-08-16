import { useCallback, useState } from 'react';

import type { SortableDragItem, UseSortableDragArgs, UseSortableDragReturn } from '@/types';

// Lightweight native HTML5 drag-and-drop reordering. We compute the target
// sortOrder using the sortOrder of the item we landed on, then call back into
// the mutation. The dragged item gets a translucent style while in-flight.
// We intentionally avoid @dnd-kit so we don't add a new dependency mid-experiment.
// Generic over any item with an id + sortOrder (SortableDragItem) so both
// context pack items and router chain entries (smart-router admin) reuse
// this one implementation rather than duplicating it.
export function useContextPackItemDrag<T extends SortableDragItem>({
  items,
  isDragSupported,
  onReorder,
}: UseSortableDragArgs<T>): UseSortableDragReturn {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);

  const handleDragStart = useCallback(
    (index: number): void => {
      if (!isDragSupported) {
        return;
      }
      setDraggingIndex(index);
    },
    [isDragSupported],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent, index: number): void => {
      if (!isDragSupported) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      setTargetIndex(index);
    },
    [isDragSupported],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent): void => {
      if (!isDragSupported) {
        return;
      }
      event.preventDefault();
    },
    [isDragSupported],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent, dropIndex: number): void => {
      if (!isDragSupported) {
        return;
      }
      event.preventDefault();
      const sourceIndex = draggingIndex;
      setDraggingIndex(null);
      setTargetIndex(null);
      if (sourceIndex === null || sourceIndex === dropIndex) {
        return;
      }
      const target = items[dropIndex];
      const source = items[sourceIndex];
      if (!target || !source) {
        return;
      }
      onReorder(source.id, target.sortOrder);
    },
    [draggingIndex, isDragSupported, items, onReorder],
  );

  const handleDragEnd = useCallback((): void => {
    setDraggingIndex(null);
    setTargetIndex(null);
  }, []);

  return {
    draggingIndex,
    targetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}
