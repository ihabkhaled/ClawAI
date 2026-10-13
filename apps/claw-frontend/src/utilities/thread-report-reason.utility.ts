import { THREAD_REPORT_REASONS } from '@/constants/thread-publication.constants';
import type { ThreadReportReason } from '@/types/thread-publication.types';

/** A value from the reason picker as a known reason, or null for anything else. */
export function parseThreadReportReason(value: string): ThreadReportReason | null {
  return THREAD_REPORT_REASONS.find((reason) => reason === value) ?? null;
}
