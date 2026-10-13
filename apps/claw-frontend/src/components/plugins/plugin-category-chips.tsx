import { Button } from '@/components/ui/button';
import { PLUGIN_CATEGORIES, PLUGIN_CHIP_CLASSES } from '@/constants/plugins.constants';
import type { PluginCategoryChipsProps } from '@/types/plugins.types';

/** Category chips; "All" clears the filter. They wrap on a phone so nothing scrolls sideways. */
export function PluginCategoryChips({
  value,
  onChange,
  t,
}: PluginCategoryChipsProps): React.ReactElement {
  const options = [
    { key: '', label: t('plugins.categories.all') },
    ...PLUGIN_CATEGORIES.map((key) => ({ key, label: t(`plugins.categories.${key}`) })),
  ];
  return (
    <div role="group" aria-label={t('plugins.categoryLabel')} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.key}
          type="button"
          size="sm"
          variant={value === option.key ? 'default' : 'outline'}
          aria-pressed={value === option.key}
          className={PLUGIN_CHIP_CLASSES}
          onClick={() => {
            onChange(option.key);
          }}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
