import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useOpenGrafana } from '@/hooks/observability/use-open-grafana';
import { useTranslation } from '@/lib/i18n';

export function OpenGrafanaButton(): React.ReactElement | null {
  const { t } = useTranslation();
  const { canOpenGrafana, isOpening, openGrafana } = useOpenGrafana();

  if (!canOpenGrafana) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={openGrafana}
      disabled={isOpening}
      aria-busy={isOpening}
      title={t('observability.grafana.hint')}
    >
      <ExternalLink className="me-2 h-4 w-4" aria-hidden="true" />
      {isOpening ? t('observability.grafana.opening') : t('observability.grafana.open')}
    </Button>
  );
}
