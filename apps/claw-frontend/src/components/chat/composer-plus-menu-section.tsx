import type { ComposerPlusMenuSectionProps } from '@/types/composer-plus-menu.types';

/** A labelled group inside the "+" menu. The label is also the accessible name of the group. */
export function ComposerPlusMenuSection({
  title,
  children,
}: ComposerPlusMenuSectionProps): React.ReactElement {
  return (
    <section aria-label={title} className="flex flex-col gap-0.5 px-1 py-1.5">
      <h3 className="text-muted-foreground px-2 pb-0.5 text-[11px] font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
