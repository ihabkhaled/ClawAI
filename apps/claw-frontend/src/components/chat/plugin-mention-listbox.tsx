'use client';

import { PluginIcon } from '@/components/plugins/plugin-icon';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { PluginMentionListboxProps } from '@/types/plugin-mention.types';

/**
 * The `@` picker's list: the user's installed, enabled plugins that match what was typed.
 * Focus never leaves the textarea; the active row is announced through its
 * `aria-activedescendant`, and a polite status line says how many matches there are.
 *
 * Rows keep a 44px touch target. A mouse press is swallowed (`preventDefault` on mousedown) so
 * choosing a row never steals the caret from the text.
 */
export function PluginMentionListbox({
  listboxId,
  options,
  activeIndex,
  onSelect,
  onHover,
}: PluginMentionListboxProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div
      data-testid="plugin-mention-popover"
      className="bg-popover text-popover-foreground absolute start-0 bottom-full z-50 mb-1 w-full max-w-sm overflow-hidden rounded-lg border shadow-md"
    >
      <ul
        role="listbox"
        id={listboxId}
        aria-label={t('pluginChat.mention.listLabel')}
        className="max-h-56 overflow-y-auto p-1"
      >
        {options.map((option, index) => (
          <li
            key={option.installId}
            id={`${listboxId}-option-${String(index)}`}
            role="option"
            aria-selected={index === activeIndex}
            onMouseDown={(event) => event.preventDefault()}
            tabIndex={-1}
            onClick={() => onSelect(index)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(index);
              }
            }}
            onMouseEnter={() => onHover(index)}
            className={cn(
              'touch:min-h-11 flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
              index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
            )}
          >
            <PluginIcon iconKey={option.iconKey} className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-medium">{option.name}</span>
            <span className="text-muted-foreground shrink-0 text-xs" dir="ltr">
              @{option.slug}
            </span>
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {t('pluginChat.mention.count', { value: String(options.length) })}
      </p>
    </div>
  );
}
