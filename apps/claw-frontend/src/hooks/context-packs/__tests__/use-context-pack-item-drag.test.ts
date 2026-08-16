import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useContextPackItemDrag } from '@/hooks/context-packs/use-context-pack-item-drag';

// Generic over any {id, sortOrder} item (SortableDragItem) — proven here with
// a minimal shape rather than a full ContextPackItem, since the hook never
// reads anything else. The smart-router admin's chain-entry reordering reuses
// this exact hook the same way (see smart-router-chain-entry-list.tsx).
const items = [
  { id: 'a', sortOrder: 1 },
  { id: 'b', sortOrder: 2 },
  { id: 'c', sortOrder: 3 },
];

function makeDragEvent(): React.DragEvent {
  return {
    preventDefault: vi.fn(),
    dataTransfer: { dropEffect: '' },
  } as unknown as React.DragEvent;
}

describe('useContextPackItemDrag (generic)', () => {
  it('starts with no dragging or target index', () => {
    const { result } = renderHook(() =>
      useContextPackItemDrag({ items, isDragSupported: true, onReorder: vi.fn() }),
    );
    expect(result.current.draggingIndex).toBeNull();
    expect(result.current.targetIndex).toBeNull();
  });

  it('drop calls onReorder with the dragged item id and the target sortOrder', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() =>
      useContextPackItemDrag({ items, isDragSupported: true, onReorder }),
    );

    act(() => result.current.handleDragStart(0));
    act(() => result.current.handleDrop(makeDragEvent(), 2));

    expect(onReorder).toHaveBeenCalledWith('a', 3);
    expect(result.current.draggingIndex).toBeNull();
  });

  it('does nothing when drag is not supported', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() =>
      useContextPackItemDrag({ items, isDragSupported: false, onReorder }),
    );

    act(() => result.current.handleDragStart(0));
    expect(result.current.draggingIndex).toBeNull();
    act(() => result.current.handleDrop(makeDragEvent(), 2));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('dropping on the same index is a no-op', () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() =>
      useContextPackItemDrag({ items, isDragSupported: true, onReorder }),
    );

    act(() => result.current.handleDragStart(0));
    act(() => result.current.handleDrop(makeDragEvent(), 0));

    expect(onReorder).not.toHaveBeenCalled();
  });
});
