// Buckets a chat thread's `updatedAt` ISO timestamp into one of four
// human-friendly groups used by the chat thread list:
//
//   - ThreadDateGroup.TODAY      same calendar day as `now`
//   - ThreadDateGroup.YESTERDAY  exactly one calendar day before `now`
//   - ThreadDateGroup.THIS_WEEK  within the last 7 calendar days (excluding today/yesterday)
//   - ThreadDateGroup.OLDER      everything older than 7 calendar days
//
// The bucket id is stable across timezones because we compare *local* calendar
// days (not raw millisecond diffs); a chat at 23:59 today and a chat at 00:01
// tomorrow correctly end up in different buckets.
import { ThreadDateGroup } from '@/enums';
import type { ChatThread, ThreadDateGroupBucket } from '@/types';

export function getThreadDateGroupId(iso: string, now: Date = new Date()): ThreadDateGroup {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return ThreadDateGroup.OLDER;
  }
  const startOfDay = (x: Date): number =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / dayMs);
  if (diffDays <= 0) {
    return ThreadDateGroup.TODAY;
  }
  if (diffDays === 1) {
    return ThreadDateGroup.YESTERDAY;
  }
  if (diffDays < 7) {
    return ThreadDateGroup.THIS_WEEK;
  }
  return ThreadDateGroup.OLDER;
}

const GROUP_ORDER: ThreadDateGroup[] = [
  ThreadDateGroup.TODAY,
  ThreadDateGroup.YESTERDAY,
  ThreadDateGroup.THIS_WEEK,
  ThreadDateGroup.OLDER,
];

/**
 * Bucket an ordered list of threads (most-recent first) into the four date
 * groups. Returns a stable, gap-free array of `ThreadDateGroupBucket` — empty
 * groups are dropped. Item order inside each bucket matches the input order.
 */
export function groupThreadsByDate(
  threads: ChatThread[],
  now: Date = new Date(),
): ThreadDateGroupBucket[] {
  const buckets = new Map<ThreadDateGroup, ChatThread[]>();
  for (const id of GROUP_ORDER) {
    buckets.set(id, []);
  }
  for (const thread of threads) {
    const id = getThreadDateGroupId(thread.updatedAt, now);
    buckets.get(id)?.push(thread);
  }
  const result: ThreadDateGroupBucket[] = [];
  for (const id of GROUP_ORDER) {
    const items = buckets.get(id) ?? [];
    if (items.length > 0) {
      result.push({ id, threads: items });
    }
  }
  return result;
}
