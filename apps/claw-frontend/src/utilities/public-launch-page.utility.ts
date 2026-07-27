import type { Locale } from '@/enums/locale.enum';

export function getPublicPlanDisplayName(slug: string): string {
  return `${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
}

export function formatPublicPlanUsd(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
