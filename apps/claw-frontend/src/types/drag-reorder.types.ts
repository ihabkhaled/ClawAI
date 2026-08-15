/** Minimal shape the native-HTML5 drag-reorder hook needs from an item: an
 * identity to report back through `onReorder`, and a numeric position to
 * compute the drop target against. Any list item type — a context pack item,
 * a router chain entry — can satisfy this without being coupled to it. */
export type SortableDragItem = {
  id: string;
  sortOrder: number;
};

export type UseSortableDragArgs<T extends SortableDragItem> = {
  items: T[];
  isDragSupported: boolean;
  onReorder: (itemId: string, newSortOrder: number) => void;
};

export type UseSortableDragReturn = {
  draggingIndex: number | null;
  targetIndex: number | null;
  handleDragStart: (index: number) => void;
  handleDragOver: (event: React.DragEvent, index: number) => void;
  handleDragLeave: (event: React.DragEvent) => void;
  handleDrop: (event: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
};
