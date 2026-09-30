import { Plus, Trash2 } from 'lucide-react';

import { PasswordInput } from '@/components/common/password-input';
import { FieldHint } from '@/components/connectors/field-hint';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { GATEWAY_HEADER_NAME_PLACEHOLDER } from '@/constants/connector-gateway-headers.constants';
import { useTranslation } from '@/lib/i18n';
import type { ConnectorGatewayHeadersFieldProps } from '@/types';

export function ConnectorGatewayHeadersField({
  isEditing,
  gatewayHeaders,
  error,
}: ConnectorGatewayHeadersFieldProps): React.ReactElement {
  const { t } = useTranslation();
  const { rows, addRow, updateRow, removeRow, clearStored, setClearStored } = gatewayHeaders;
  return (
    <fieldset className="grid grid-cols-1 gap-2">
      <legend className="text-sm font-medium">{t('connectors.gatewayHeaders')}</legend>
      <FieldHint text={t('connectors.gatewayHeadersHelp')} />
      {isEditing ? <FieldHint text={t('connectors.gatewayHeadersEditHelp')} /> : null}
      {rows.map((row) => (
        <div key={row.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Input
            aria-label={t('connectors.gatewayHeaderName')}
            value={row.name}
            onChange={(e) => updateRow(row.id, { name: e.target.value })}
            placeholder={GATEWAY_HEADER_NAME_PLACEHOLDER}
            autoComplete="off"
            className="min-w-0 flex-1"
          />
          <div className="min-w-0 flex-1">
            <PasswordInput
              id={`connector-gateway-header-value-${row.id}`}
              aria-label={t('connectors.gatewayHeaderValue')}
              value={row.value}
              onChange={(e) => updateRow(row.id, { value: e.target.value })}
              placeholder={t('connectors.gatewayHeaderValue')}
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeRow(row.id)}
            aria-label={t('connectors.removeGatewayHeader')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="me-1 h-4 w-4" />
          {t('connectors.addGatewayHeader')}
        </Button>
      </div>
      {isEditing && rows.length === 0 ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={clearStored}
            onCheckedChange={(checked) => setClearStored(checked === true)}
          />
          {t('connectors.clearGatewayHeaders')}
        </label>
      ) : null}
      {error ? (
        <p className="text-destructive mt-1 text-sm">{t('connectors.gatewayHeadersInvalid')}</p>
      ) : null}
    </fieldset>
  );
}
