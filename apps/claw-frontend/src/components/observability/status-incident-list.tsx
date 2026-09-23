import { STATUS_COMPONENT_LABEL_KEYS } from '@/constants/service-status.constants';
import { useTranslation } from '@/lib/i18n';
import type { StatusIncidentListProps } from '@/types';
import { formatIncidentDuration, formatIncidentTime } from '@/utilities/service-status.utility';

import { ComponentStateBadge } from './component-state-badge';

export function StatusIncidentList({ incidents }: StatusIncidentListProps) {
  const { t, locale } = useTranslation();

  return (
    <section className="mt-6 border-t pt-4">
      <h3 className="mb-3 text-sm font-semibold">{t('observability.status.incidentsTitle')}</h3>
      {incidents.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('observability.status.noIncidents')}</p>
      ) : (
        <ul className="space-y-3">
          {incidents.map((incident) => (
            <li
              key={`${incident.component}-${incident.startedAt}`}
              className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">
                  {t(STATUS_COMPONENT_LABEL_KEYS[incident.component])}
                </span>
                <ComponentStateBadge state={incident.state} />
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                <time dateTime={incident.startedAt}>
                  {t('observability.status.startedAt', {
                    time: formatIncidentTime(incident.startedAt, locale),
                  })}
                </time>
                <span>
                  {incident.endedAt === null
                    ? t('observability.status.ongoingFor', {
                        duration: formatIncidentDuration(incident.durationSeconds, locale),
                      })
                    : t('observability.status.lasted', {
                        duration: formatIncidentDuration(incident.durationSeconds, locale),
                      })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
