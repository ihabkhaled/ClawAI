import Link from 'next/link';

import type { ModelCatalogProps } from '@/types/models-component.types';

/**
 * Renders the provider's models from `MODEL_FACTS`, never from hand-typed
 * prose. Cost is always the qualitative band (never an exact price — the
 * seed file's numbers are estimates), and no speed/latency value is ever
 * rendered here, because none is sourced (§8.1). The "confirm the live
 * catalog" qualifier and the `/pricing` link are mandatory on every page that
 * names a model.
 */
export function ModelCatalog({
  heading,
  costBandLabel,
  costBandNames,
  hasNamedModels,
  models,
  costBandByClass,
  source,
  sourceLabel,
  disclaimer,
  pricingHref,
  seePricing,
}: ModelCatalogProps): React.ReactElement {
  return (
    <div className="editorial-comparison__section" id="models">
      <h2 className="editorial-comparison__section-heading">{heading}</h2>
      {hasNamedModels ? (
        <dl className="editorial-comparison__faq" aria-label={heading}>
          {models.map((model) => (
            <div className="editorial-comparison__faq-item" key={model.modelKey}>
              <dt className="editorial-comparison__faq-question">{model.displayName}</dt>
              <dd className="editorial-comparison__faq-answer">
                {costBandLabel}: {costBandNames[costBandByClass[model.costClass]]}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="editorial-comparison__body">
        {disclaimer}{' '}
        <Link href={pricingHref} className="editorial-comparison__rail-link">
          {seePricing}
        </Link>
      </p>
      <p className="editorial-comparison__body">
        <a
          href={source.url}
          className="editorial-comparison__rail-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {sourceLabel}: {source.label}
        </a>
      </p>
    </div>
  );
}
