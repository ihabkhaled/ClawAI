/**
 * Where arrow-key focus goes next inside the "+" menu, or null when the key is not
 * one the menu handles. Moves wrap, so Down on the last row lands on the first.
 */
export function nextPlusMenuIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) {
    return null;
  }
  switch (key) {
    case 'ArrowDown':
      return current < 0 ? 0 : (current + 1) % count;
    case 'ArrowUp':
      return current <= 0 ? count - 1 : current - 1;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
