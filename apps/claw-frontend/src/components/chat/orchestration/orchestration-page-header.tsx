import { cn } from '@/lib/utils';
import type { OrchestrationPageHeaderProps } from '@/types/orchestration.types';

// Gradient hero rendered at the top of every orchestration lab page.
//
// Layout:
//   ┌─────────────────────────────────────────────────────────────┐
//   │ ┌─icon─┐  Title                            [optional badge]  │
//   │ │ 🧠   │  Description text                                   │
//   │ └──────┘                                                     │
//   └─────────────────────────────────────────────────────────────┘
//
// The icon tile is filled with the project's brand gradient via the
// `--gradient-brand` CSS token (defined in app/globals.css). We apply
// it as an arbitrary background-image value so the same token-driven
// dark-mode adjustment kicks in for free; using a Tailwind utility
// alias would require extending tailwind.config.ts which is out of
// scope for this shell.
//
// Semantic colours only — no `dark:` prefixes, no raw colour classes.
export function OrchestrationPageHeader({
  icon: Icon,
  title,
  description,
  badge,
  className,
}: OrchestrationPageHeaderProps): React.ReactElement {
  return (
    <header
      className={cn(
        'border-border/60 bg-card shadow-soft relative mb-4 overflow-hidden rounded-2xl border p-5 sm:p-6',
        // Subtle radial wash in the top-right that mirrors the dashboard
        // hero so orchestration pages feel part of the same surface.
        'before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_55%)]',
        className,
      )}
    >
      <div className="relative flex items-start gap-4">
        <div
          className="text-primary-foreground shadow-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundImage: 'var(--gradient-brand)' }}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h1>
            {badge !== undefined && badge !== null ? <div className="shrink-0">{badge}</div> : null}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
      </div>
    </header>
  );
}
