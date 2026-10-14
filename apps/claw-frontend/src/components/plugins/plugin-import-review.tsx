import { Loader2, ShieldAlert } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  PLUGIN_IMPORT_RISK_KEYS,
  PLUGIN_IMPORT_RISK_VARIANTS,
} from '@/constants/plugin-import.constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { PluginImportReviewProps } from '@/types/plugin-import.types';
import { pluginImportWarningKey, shortCommit } from '@/utilities/plugin-import.utility';

import { PluginImportComponentRow } from './plugin-import-component-row';

/** The review before install: source, pinned commit, checksum, risk, every component, warnings, consent. */
export function PluginImportReview({
  draft,
  acknowledged,
  setAcknowledged,
  canInstall,
  busy,
  onInstall,
  onDiscard,
  t,
}: PluginImportReviewProps): React.ReactElement {
  const { preview, source } = draft;
  const warnings = preview.warnings.flatMap((warning) => {
    const key = pluginImportWarningKey(warning);
    return key === undefined ? [] : [key];
  });
  return (
    <section
      className="space-y-4 rounded-lg border p-4"
      aria-label={t('pluginImport.review.title')}
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold break-all">{preview.name}</h2>
          <Badge variant="outline">{preview.version}</Badge>
          <Badge variant={PLUGIN_IMPORT_RISK_VARIANTS[preview.risk]}>
            <ShieldAlert className="me-1 h-3 w-3" aria-hidden="true" />
            {t(PLUGIN_IMPORT_RISK_KEYS[preview.risk])}
          </Badge>
        </div>
        {preview.description === '' ? null : (
          <p className="text-muted-foreground text-sm">{preview.description}</p>
        )}
      </header>

      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">{t('pluginImport.review.source')}</dt>
        <dd dir="ltr" className="break-all">
          {source.ref}
        </dd>
        {source.commitSha === null ? null : (
          <>
            <dt className="text-muted-foreground">{t('pluginImport.review.commit')}</dt>
            <dd dir="ltr" className="font-mono">
              {shortCommit(source.commitSha)}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">{t('pluginImport.review.checksum')}</dt>
        <dd dir="ltr" className="font-mono break-all">
          {draft.checksum}
        </dd>
        {preview.author === '' ? null : (
          <>
            <dt className="text-muted-foreground">{t('pluginImport.review.author')}</dt>
            <dd>{preview.author}</dd>
          </>
        )}
        {preview.license === '' ? null : (
          <>
            <dt className="text-muted-foreground">{t('pluginImport.review.license')}</dt>
            <dd>{preview.license}</dd>
          </>
        )}
        <dt className="text-muted-foreground">{t('pluginImport.review.files')}</dt>
        <dd>
          {t('pluginImport.review.filesValue', {
            kept: preview.keptFileCount,
            ignored: preview.ignoredFileCount,
          })}
        </dd>
      </dl>

      {warnings.length === 0 ? null : (
        <Alert
          variant={AlertVariant.Warning}
          description={
            <ul className="list-disc ps-4">
              {warnings.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          }
        />
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t('pluginImport.review.componentsTitle')}</h3>
        {preview.components.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('pluginImport.review.noComponents')}</p>
        ) : (
          <ul className="space-y-2">
            {preview.components.map((component) => (
              <PluginImportComponentRow
                key={`${component.kind}:${component.name}`}
                component={component}
                t={t}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
        <Checkbox
          id="plugin-import-ack"
          checked={acknowledged}
          onCheckedChange={(checked) => {
            setAcknowledged(checked === true);
          }}
        />
        <label htmlFor="plugin-import-ack" className="space-y-1 text-sm">
          <span className="font-medium">{t('pluginImport.review.acknowledge')}</span>
          <span className="text-muted-foreground block text-xs">
            {t('pluginImport.review.acknowledgeBody')}
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!canInstall} onClick={onInstall}>
          {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {busy ? t('pluginImport.review.installing') : t('pluginImport.review.install')}
        </Button>
        <Button type="button" variant="outline" onClick={onDiscard}>
          {t('pluginImport.review.cancel')}
        </Button>
      </div>
    </section>
  );
}
