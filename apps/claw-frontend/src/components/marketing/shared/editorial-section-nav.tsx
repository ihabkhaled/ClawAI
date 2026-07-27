import type { EditorialSectionNavProps } from '@/types/marketing-editorial.types';

export function EditorialSectionNav({
  label,
  items,
}: EditorialSectionNavProps): React.ReactElement {
  return (
    <nav className="editorial-section-nav" aria-label={label}>
      <p className="editorial-section-nav__label">{label}</p>
      <ol className="editorial-section-nav__list">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`}>{item.label}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
