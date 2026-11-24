import type { LiveIntelligenceItemListProps } from '@/types/live-intelligence-marketing.types';

/** A titled list (steps, outcomes, modes, limits) in the editorial vocabulary. */
export function LiveIntelligenceItemList({
  items,
  ordered = false,
}: LiveIntelligenceItemListProps): React.ReactElement {
  const children = items.map((item) => (
    <li key={item.title} className="editorial-comparison__list-item">
      <strong>{item.title}</strong>
      <span>{item.body}</span>
    </li>
  ));
  return ordered ? (
    <ol className="editorial-comparison__steps">{children}</ol>
  ) : (
    <ul className="editorial-comparison__list">{children}</ul>
  );
}
