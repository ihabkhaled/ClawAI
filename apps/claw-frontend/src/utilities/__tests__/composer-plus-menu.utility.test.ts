import { describe, expect, it } from 'vitest';

import { nextPlusMenuIndex } from '@/utilities/composer-plus-menu.utility';

describe('nextPlusMenuIndex', () => {
  it('moves down and wraps to the first row', () => {
    expect(nextPlusMenuIndex('ArrowDown', 0, 3)).toBe(1);
    expect(nextPlusMenuIndex('ArrowDown', 2, 3)).toBe(0);
  });

  it('starts at the first row when nothing in the menu is focused', () => {
    expect(nextPlusMenuIndex('ArrowDown', -1, 3)).toBe(0);
  });

  it('moves up and wraps to the last row', () => {
    expect(nextPlusMenuIndex('ArrowUp', 2, 3)).toBe(1);
    expect(nextPlusMenuIndex('ArrowUp', 0, 3)).toBe(2);
    expect(nextPlusMenuIndex('ArrowUp', -1, 3)).toBe(2);
  });

  it('jumps to the ends with Home and End', () => {
    expect(nextPlusMenuIndex('Home', 2, 4)).toBe(0);
    expect(nextPlusMenuIndex('End', 0, 4)).toBe(3);
  });

  it('ignores other keys and empty menus', () => {
    expect(nextPlusMenuIndex('Enter', 0, 3)).toBeNull();
    expect(nextPlusMenuIndex('ArrowDown', 0, 0)).toBeNull();
  });
});
