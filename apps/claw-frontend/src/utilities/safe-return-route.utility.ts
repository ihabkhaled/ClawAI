import { ROUTES } from '@/constants';

export function safeReturnRoute(value: string | null): string {
  if (value === null || !value.startsWith('/') || value.startsWith('//')) {
    return ROUTES.CHAT;
  }
  return value;
}
