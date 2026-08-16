import { useContextPackItemDrag } from '@/hooks/context-packs/use-context-pack-item-drag';
import { useMediaQuery } from '@/hooks/ui/use-media-query';
import type { SmartRouterChainEntryListProps } from '@/types/smart-router-admin.types';

import { SmartRouterChainEntryRow } from './smart-router-chain-entry-row';

// Reuses the accessible drag-reorder interaction from context-packs
// (use-context-pack-item-drag.ts, now generic over any {id, sortOrder} item)
// rather than a second implementation. Chain entries key their position on
// `order`, not `sortOrder`, so we adapt at the boundary: drag math only ever
// needs id + a numeric position, never the rest of the entry.
//
// Drag capability mirrors context/page.tsx: narrow viewports (touch, no
// reliable HTML5 drag) fall back to keyboard-operable up/down buttons on
// each row instead of drag-and-drop, so reordering stays accessible.
export function SmartRouterChainEntryList({
  entries,
  isEditable,
  isUpdatePending,
  onReorder,
  onRemove,
  t,
}: SmartRouterChainEntryListProps): React.ReactElement {
  const isWideViewport = useMediaQuery('(min-width: 768px)');
  const isDragSupported = isEditable && isWideViewport;
  const dragItems = entries.map((entry) => ({ id: entry.id, sortOrder: entry.order }));
  const {
    draggingIndex,
    targetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useContextPackItemDrag({
    items: dragItems,
    isDragSupported,
    onReorder,
  });

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const isFirst = index === 0;
        const isLast = index === entries.length - 1;
        const prevEntry = entries[index - 1];
        const nextEntry = entries[index + 1];

        return (
          <SmartRouterChainEntryRow
            key={entry.id}
            entry={entry}
            index={index}
            isFirst={isFirst}
            isLast={isLast}
            isEditable={isEditable}
            isDragSupported={isDragSupported}
            isDragging={draggingIndex === index}
            isDragTarget={
              targetIndex === index && draggingIndex !== null && draggingIndex !== index
            }
            isUpdatePending={isUpdatePending}
            onMoveUp={() => {
              if (prevEntry) {
                onReorder(entry.id, prevEntry.order);
              }
            }}
            onMoveDown={() => {
              if (nextEntry) {
                onReorder(entry.id, nextEntry.order);
              }
            }}
            onRemove={() => onRemove(entry.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            t={t}
          />
        );
      })}
    </div>
  );
}
