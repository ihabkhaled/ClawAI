import type { RelativeTimeUnit } from '@/enums/relative-time-unit.enum';

/** `null` means "just now" (under a minute old, or in the future through clock skew). */
export type RelativeBucket = { value: number; unit: RelativeTimeUnit } | null;

export type FormatRelativeTimeOptions = {
  iso: string;
  nowMs: number;
  locale: string;
  justNowLabel: string;
};

export type UseRelativeTimeResult = {
  /** Text shown in the page: relative once mounted, the UTC date during server render. */
  label: string;
  /** Full date and time in the visitor's zone once mounted, the UTC date-time before. */
  title: string;
  /** Normalised UTC ISO string for `<time datetime>`; empty when the value is invalid. */
  dateTime: string;
};

export type RelativeTimeProps = {
  /** ISO-8601 instant, UTC. */
  value: string;
  className?: string;
};
