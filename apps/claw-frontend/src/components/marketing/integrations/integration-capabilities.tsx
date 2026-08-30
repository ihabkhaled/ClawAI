import type { IntegrationCapabilitiesProps } from '@/types/integrations-component.types';

/**
 * Renders the connector's real capabilities from `INTEGRATION_FACTS`.
 *
 * This is the component that keeps a page from claiming "real-time sync" for a
 * connector whose webhook delivery is actually rejected — the read/write lists
 * and the sync-timing label come from the same source of truth the copy is
 * checked against, not from prose someone typed once and never revisited.
 */
export function IntegrationCapabilities({
  heading,
  readLabel,
  writeLabel,
  syncLabel,
  realTimeLabel,
  pollBasedLabel,
  readableObjects,
  writeActions,
  isRealTime,
}: IntegrationCapabilitiesProps): React.ReactElement {
  return (
    <div className="editorial-comparison__section">
      <h2 className="editorial-comparison__section-heading">{heading}</h2>
      <dl className="editorial-comparison__faq" aria-label={heading}>
        <div className="editorial-comparison__faq-item">
          <dt className="editorial-comparison__faq-question">{readLabel}</dt>
          <dd className="editorial-comparison__faq-answer">{readableObjects.join(', ')}</dd>
        </div>
        <div className="editorial-comparison__faq-item">
          <dt className="editorial-comparison__faq-question">{writeLabel}</dt>
          <dd className="editorial-comparison__faq-answer">{writeActions.join(', ')}</dd>
        </div>
        <div className="editorial-comparison__faq-item">
          <dt className="editorial-comparison__faq-question">{syncLabel}</dt>
          <dd className="editorial-comparison__faq-answer">
            {isRealTime ? realTimeLabel : pollBasedLabel}
          </dd>
        </div>
      </dl>
    </div>
  );
}
