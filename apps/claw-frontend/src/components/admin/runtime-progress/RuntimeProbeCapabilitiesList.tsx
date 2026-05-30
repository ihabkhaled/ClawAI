import { RUNTIME_PROBE_CAPABILITY_LABELS } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { RuntimeProbeCapabilitiesListProps } from '@/types';

import { RuntimeProbeCapabilityRow } from './RuntimeProbeCapabilityRow';

// Renders the capabilities checklist for a single runtime. Each row is
// rendered through RuntimeProbeCapabilityRow so the green-check / muted-cross
// styling stays consistent across capabilities. Falls back to a small
// "unknown" placeholder when the runtime didn't return a capabilities object.
export function RuntimeProbeCapabilitiesList({
  capabilities,
}: RuntimeProbeCapabilitiesListProps): React.ReactElement {
  const { t } = useTranslation();

  if (capabilities === undefined) {
    return (
      <p className="text-xs italic text-muted-foreground">
        {t('runtimeProgress.diagnostics.capabilitiesUnknown')}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {RUNTIME_PROBE_CAPABILITY_LABELS.map(({ key, labelKey }) => (
        <RuntimeProbeCapabilityRow key={key} labelKey={labelKey} enabled={capabilities[key]} />
      ))}
    </ul>
  );
}
