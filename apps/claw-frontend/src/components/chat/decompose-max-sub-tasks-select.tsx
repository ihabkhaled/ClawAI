import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DECOMPOSE_MAX_SUB_TASK_OPTIONS } from '@/constants';
import type { DecomposeMaxSubTasksSelectProps } from '@/types';

// Max-sub-tasks picker for the Decompose lab. Renders the shared
// shadcn <Select /> because raw <select> is banned by rules/03-frontend.
// Wraps the choice list in `DECOMPOSE_MAX_SUB_TASK_OPTIONS` so the
// allowed range (2-5) lives in a constants file, not inline.
export function DecomposeMaxSubTasksSelect({
  value,
  onChange,
  disabled,
  t,
}: DecomposeMaxSubTasksSelectProps): React.ReactElement {
  const handleChange = (next: string): void => {
    const parsed = Number.parseInt(next, 10);
    if (Number.isFinite(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="decompose-max-sub-tasks"
        className="block text-sm font-medium text-foreground"
      >
        {t('decompose.maxSubTasks')}
      </label>
      <Select value={String(value)} onValueChange={handleChange} disabled={disabled === true}>
        <SelectTrigger id="decompose-max-sub-tasks" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DECOMPOSE_MAX_SUB_TASK_OPTIONS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
