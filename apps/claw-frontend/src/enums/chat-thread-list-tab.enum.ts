// Tab filter for the chat thread list page. The page header renders three
// tabs that scope the visible threads to one of these subsets. Archived
// threads are only shown when this enum is `ARCHIVED` — i.e. the legacy
// "show archived" toggle has been folded into the tab control.
export enum ChatThreadListTab {
  ALL = 'ALL',
  PINNED = 'PINNED',
  ARCHIVED = 'ARCHIVED',
}
