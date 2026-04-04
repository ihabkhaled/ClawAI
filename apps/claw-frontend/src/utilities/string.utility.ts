export function getInitials(name: string | null | undefined): string {
  if (!name) {
    return '??';
  }
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
