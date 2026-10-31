import { Search, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  THREAD_LIST_STATUS_LABEL_KEYS,
  THREAD_LIST_STATUS_VALUES,
} from '@/constants/thread-list.constants';
import type { ThreadListStatus } from '@/enums/thread-list-status.enum';
import { useThreadListText } from '@/hooks/threads/use-thread-list-text';
import type { ThreadListToolbarProps } from '@/types/thread-list.types';

/** Search box (with a clear button) and the status filter. */
export function ThreadListToolbar({
  search,
  onSearchChange,
  onSearchClear,
  status,
  onStatusChange,
}: ThreadListToolbarProps): ReactElement {
  const tl = useThreadListText();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center" role="search">
      <div className="relative min-w-0 flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={tl('threadListSearchPlaceholder')}
          aria-label={tl('threadListSearchLabel')}
          className="ps-9 pe-10"
          data-testid="thread-list-search"
        />
        {search === '' ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onSearchClear}
            aria-label={tl('threadListSearchClear')}
            className="absolute end-1 top-1/2 -translate-y-1/2"
            data-testid="thread-list-search-clear"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <Select value={status} onValueChange={(value) => onStatusChange(value as ThreadListStatus)}>
        <SelectTrigger
          aria-label={tl('threadListStatusLabel')}
          className="sm:w-48"
          data-testid="thread-list-status"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {THREAD_LIST_STATUS_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              {tl(THREAD_LIST_STATUS_LABEL_KEYS[value])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
