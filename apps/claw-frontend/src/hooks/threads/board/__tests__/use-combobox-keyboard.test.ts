import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useComboboxKeyboard } from '../use-combobox-keyboard';

const handlers = {
  onOpenChange: vi.fn(),
  onSelectSuggestion: vi.fn(),
  onSubmitQuery: vi.fn(),
  onClear: vi.fn(),
};

function setup(overrides: { isOpen?: boolean; optionCount?: number; hasQuery?: boolean } = {}) {
  return renderHook(() =>
    useComboboxKeyboard({
      optionCount: 3,
      isOpen: true,
      hasQuery: true,
      listboxId: 'lb',
      ...handlers,
      ...overrides,
    }),
  );
}

function press(result: { current: ReturnType<typeof useComboboxKeyboard> }, key: string) {
  const preventDefault = vi.fn();
  act(() => result.current.onKeyDown({ key, preventDefault }));
  return preventDefault;
}

beforeEach(() => vi.clearAllMocks());

describe('useComboboxKeyboard', () => {
  it('starts with no active option and exposes show-all as the last index', () => {
    const { result } = setup();
    expect(result.current.activeIndex).toBe(-1);
    expect(result.current.showAllIndex).toBe(3);
    expect(result.current.activeDescendantId).toBeUndefined();
  });

  it('ArrowDown moves and wraps through suggestions plus show-all', () => {
    const { result } = setup();
    const seen: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      press(result, 'ArrowDown');
      seen.push(result.current.activeIndex);
    }
    expect(seen).toEqual([0, 1, 2, 3, 0]);
    expect(result.current.activeDescendantId).toBe('lb-option-0');
  });

  it('ArrowUp from nothing goes to the last option and wraps', () => {
    const { result } = setup();
    press(result, 'ArrowUp');
    expect(result.current.activeIndex).toBe(3);
    press(result, 'ArrowUp');
    expect(result.current.activeIndex).toBe(2);
    press(result, 'Home');
    press(result, 'ArrowUp');
    expect(result.current.activeIndex).toBe(3);
  });

  it('Home and End jump to the ends', () => {
    const { result } = setup();
    press(result, 'End');
    expect(result.current.activeIndex).toBe(3);
    press(result, 'Home');
    expect(result.current.activeIndex).toBe(0);
  });

  it('ArrowDown on a closed list opens it', () => {
    const { result } = setup({ isOpen: false });
    press(result, 'ArrowDown');
    expect(handlers.onOpenChange).toHaveBeenCalledWith(true);
  });

  it('Enter on an active suggestion selects it', () => {
    const { result } = setup();
    press(result, 'ArrowDown');
    press(result, 'Enter');
    expect(handlers.onSelectSuggestion).toHaveBeenCalledWith(0);
    expect(handlers.onSubmitQuery).not.toHaveBeenCalled();
    expect(handlers.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Enter with nothing active submits the query', () => {
    const { result } = setup();
    press(result, 'Enter');
    expect(handlers.onSubmitQuery).toHaveBeenCalledTimes(1);
    expect(handlers.onSelectSuggestion).not.toHaveBeenCalled();
  });

  it('Enter on show-all submits the query', () => {
    const { result } = setup();
    press(result, 'End');
    press(result, 'Enter');
    expect(handlers.onSubmitQuery).toHaveBeenCalledTimes(1);
    expect(handlers.onSelectSuggestion).not.toHaveBeenCalled();
  });

  it('Escape closes first, then clears', () => {
    const open = setup();
    press(open.result, 'Escape');
    expect(handlers.onOpenChange).toHaveBeenCalledWith(false);
    expect(handlers.onClear).not.toHaveBeenCalled();

    const closed = setup({ isOpen: false });
    press(closed.result, 'Escape');
    expect(handlers.onClear).toHaveBeenCalledTimes(1);
  });

  it('Escape on a closed empty box does nothing', () => {
    const { result } = setup({ isOpen: false, hasQuery: false });
    const prevent = press(result, 'Escape');
    expect(handlers.onClear).not.toHaveBeenCalled();
    expect(prevent).not.toHaveBeenCalled();
  });

  it('Tab closes without preventing default', () => {
    const { result } = setup();
    const prevent = press(result, 'Tab');
    expect(handlers.onOpenChange).toHaveBeenCalledWith(false);
    expect(prevent).not.toHaveBeenCalled();
  });

  it('resets the active option when the option count changes', () => {
    const { result, rerender } = renderHook(
      ({ count }) =>
        useComboboxKeyboard({
          optionCount: count,
          isOpen: true,
          hasQuery: true,
          listboxId: 'lb',
          ...handlers,
        }),
      { initialProps: { count: 3 } },
    );
    press(result, 'ArrowDown');
    expect(result.current.activeIndex).toBe(0);
    rerender({ count: 2 });
    expect(result.current.activeIndex).toBe(-1);
  });

  it('with zero suggestions only show-all is navigable', () => {
    const { result } = setup({ optionCount: 0 });
    press(result, 'ArrowDown');
    expect(result.current.activeIndex).toBe(0);
    expect(result.current.showAllIndex).toBe(0);
    press(result, 'Enter');
    expect(handlers.onSubmitQuery).toHaveBeenCalledTimes(1);
  });
});
