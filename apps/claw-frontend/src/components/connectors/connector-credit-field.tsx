import { FieldHint } from '@/components/connectors/field-hint';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/lib/i18n';
import type { ConnectorCreditFieldProps } from '@/types';

export function ConnectorCreditField({
  checked,
  onCheckedChange,
  error,
}: ConnectorCreditFieldProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="connector-credit" className="text-sm font-medium">
          {t('connectors.creditConnector')}
        </label>
        <Switch
          id="connector-credit"
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-label={t('connectors.creditConnector')}
        />
      </div>
      <FieldHint text={t('connectors.creditConnectorHelp')} />
      {error ? <p className="text-destructive mt-1 text-sm">{error[0]}</p> : null}
    </div>
  );
}
