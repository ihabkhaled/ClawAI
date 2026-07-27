import type { RoutingRailProps } from '@/types/marketing-editorial.types';

export function RoutingRail({
  title,
  summary,
  textAlternative,
  evaluation,
  routing,
  comparison,
  receipt,
}: RoutingRailProps): React.ReactElement {
  return (
    <figure className="editorial-routing-rail" aria-label={textAlternative} data-motion="static">
      <figcaption className="editorial-routing-rail__caption">
        <h2 className="editorial-routing-rail__title">{title}</h2>
        <p className="editorial-routing-rail__summary">{summary}</p>
      </figcaption>

      <ol className="editorial-routing-rail__stages">
        <li data-stage="evaluation">
          <h3>{evaluation.label}</h3>
          <p>{evaluation.description}</p>
        </li>
        <li data-stage="routing">
          <h3>{routing.label}</h3>
          <p>{routing.description}</p>
        </li>
        <li data-stage="comparison">
          <h3>{comparison.label}</h3>
          <p>{comparison.description}</p>
        </li>
        <li data-stage="receipt">
          <h3>{receipt.label}</h3>
          <p>{receipt.description}</p>
        </li>
      </ol>
    </figure>
  );
}
