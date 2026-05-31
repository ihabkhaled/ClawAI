import { ContextPackItemRow } from '@/components/context-packs/context-pack-item-row';
import { useContextPackItemDrag } from '@/hooks/context-packs/use-context-pack-item-drag';
import type { ContextPackItemListProps } from '@/types';

export function ContextPackItemList({
  items,
  isDragSupported,
  onReorder,
  onRemove,
  isUpdatePending,
  isRemovePending,
}: ContextPackItemListProps): React.ReactElement {
  const {
    draggingIndex,
    targetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useContextPackItemDrag({ items, isDragSupported, onReorder });

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const prevItem = items[index - 1];
        const nextItem = items[index + 1];

        return (
          <ContextPackItemRow
            key={item.id}
            item={item}
            index={index}
            isFirst={isFirst}
            isLast={isLast}
            isDragSupported={isDragSupported}
            isDragging={draggingIndex === index}
            isDragTarget={targetIndex === index && draggingIndex !== null && draggingIndex !== index}
            onMoveUp={() => {
              if (prevItem) {
                onReorder(item.id, prevItem.sortOrder);
              }
            }}
            onMoveDown={() => {
              if (nextItem) {
                onReorder(item.id, nextItem.sortOrder);
              }
            }}
            onRemove={() => onRemove(item.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            isUpdatePending={isUpdatePending}
            isRemovePending={isRemovePending}
          />
        );
      })}
    </div>
  );
}
