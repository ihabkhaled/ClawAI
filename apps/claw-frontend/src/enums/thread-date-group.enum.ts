// The four date buckets the chat thread list groups threads into. Used by
// `groupThreadsByDate` and consumed by the `GroupedThreadList` component to
// pick the right localized header label.
export enum ThreadDateGroup {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'thisWeek',
  OLDER = 'older',
}
