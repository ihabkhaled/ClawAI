import Link from 'next/link';

import type { ModelCatalogProps } from '@/types/models-component.types';

/**
 * The models this deployment can actually serve for one provider.
 *
 * It used to render `MODEL_FACTS` — a hand-maintained frontend constant holding
 * 16 models, carrying a manual review date, and quietly disagreeing with both
 * the product and a second static list on the home page. Now it renders what
 * the connector catalog says, which is the same list the in-app model picker
 * offers. A page cannot advertise a model nobody can select, and cannot omit
 * one users have.
 *
 * Still no prices, for the same reason as before but now enforced at the
 * source: the backend never sends a rate (rule 37). Capability chips and the
 * context window are shown only where the catalog actually has the fact —
 * printing "Unknown" 86 times is noise, not information.
 *
 * A failed catalog fetch renders the unavailable note rather than an invented
 * list. The surrounding editorial copy, which is translated and does not depend
 * on the catalog, still renders — the page degrades, it does not disappear.
 */
export function ModelCatalog({
  heading,
  models,
  totalCount,
  visibleLimit,
  isUnavailable,
  unavailableNote,
  moreLabel,
  contextLabel,
  capabilityLabels,
  disclaimer,
  pricingHref,
  seePricing,
}: ModelCatalogProps): React.ReactElement {
  const visible = models.slice(0, visibleLimit);
  const remaining = totalCount - visible.length;

  return (
    <div className="editorial-comparison__section" id="models">
      <h2 className="editorial-comparison__section-heading">{heading}</h2>

      {isUnavailable ? (
        <p className="editorial-comparison__body" role="status">
          {unavailableNote}
        </p>
      ) : null}

      {!isUnavailable && visible.length > 0 ? (
        <>
          <ul className="editorial-comparison__model-grid" aria-label={heading}>
            {visible.map((model) => (
              <li className="editorial-comparison__model-card" key={model.modelKey}>
                <p className="editorial-comparison__model-name">{model.displayName}</p>
                <p className="editorial-comparison__model-meta">
                  {model.maxContextTokens === null
                    ? null
                    : `${contextLabel}: ${model.maxContextTokens.toLocaleString()}`}
                </p>
                <ul className="editorial-comparison__model-tags">
                  {model.supportsVision ? <li>{capabilityLabels.vision}</li> : null}
                  {model.supportsTools ? <li>{capabilityLabels.tools}</li> : null}
                  {model.supportsAudio ? <li>{capabilityLabels.audio}</li> : null}
                </ul>
              </li>
            ))}
          </ul>
          {remaining > 0 ? (
            <p className="editorial-comparison__body">
              {moreLabel.replace('{count}', String(remaining))}
            </p>
          ) : null}
        </>
      ) : null}

      <p className="editorial-comparison__body">
        {disclaimer}{' '}
        <Link href={pricingHref} className="editorial-comparison__rail-link">
          {seePricing}
        </Link>
      </p>
    </div>
  );
}
