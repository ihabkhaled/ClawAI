import { ROUTES } from '@/constants';

export function safeReturnRoute(value: string | null): string {
  if (
    value === null ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    value.trim() !== value
  ) {
    return ROUTES.CHAT;
  }
  return value;
}
