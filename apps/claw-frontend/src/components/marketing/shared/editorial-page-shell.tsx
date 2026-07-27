import type { EditorialPageShellProps } from '@/types/marketing-editorial.types';

export function EditorialPageShell({
  eyebrow,
  title,
  summary,
  sectionNavigation,
  children,
}: EditorialPageShellProps): React.ReactElement {
  return (
    <article className="editorial-page-shell" aria-labelledby="editorial-page-heading">
      <header className="editorial-page-shell__masthead">
        <div className="editorial-page-shell__masthead-inner">
          {eyebrow === undefined || eyebrow === '' ? null : (
            <p className="editorial-page-shell__eyebrow">{eyebrow}</p>
          )}
          <h1 id="editorial-page-heading" className="editorial-page-shell__title">
            {title}
          </h1>
          <p className="editorial-page-shell__summary">{summary}</p>
        </div>
      </header>

      <div className="editorial-page-shell__body">
        {sectionNavigation === undefined ? null : (
          <div className="editorial-page-shell__navigation">{sectionNavigation}</div>
        )}
        <div className="editorial-page-shell__content">{children}</div>
      </div>
    </article>
  );
}
