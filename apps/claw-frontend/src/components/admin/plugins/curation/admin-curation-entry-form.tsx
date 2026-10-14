import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ADMIN_CURATION_AUTH_KINDS,
  ADMIN_CURATION_CATEGORIES,
  ADMIN_CURATION_ICON_KEYS,
  ADMIN_CURATION_LOCALES,
  ADMIN_CURATION_NOTES_MAX,
  ADMIN_CURATION_PROBE_KEY_MAX,
  ADMIN_CURATION_TEXT_MAX,
  ADMIN_CURATION_TRANSPORTS,
  ADMIN_CURATION_URL_MAX,
} from '@/constants/plugin-admin-curation.constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import type { CuratedEntryFormProps } from '@/types/plugin-admin-curation.types';
import { categoryLabel } from '@/utilities/plugins.utility';

import { AdminCurationSelect } from './admin-curation-select';
import { AdminCurationToolsEditor } from './admin-curation-tools-editor';

/** The create / edit form: identity, server address and key, per-language text, tools, plans and notes. */
export function AdminCurationEntryForm({
  state,
  onCancel,
  t,
}: CuratedEntryFormProps): React.ReactElement {
  const { values, setField } = state;
  const text = values.texts[state.locale] ?? { name: '', summary: '', description: '' };
  const needsHeader = values.authKind === 'API_KEY' || values.authKind === 'BEARER_TOKEN';
  const hasTools = values.tools.some((tool) => tool.selected);
  const options = (list: ReadonlyArray<{ value: string; labelKey: string }>) =>
    list.map((item) => ({ value: item.value, label: t(item.labelKey) }));
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {state.isEdit ? null : (
          <div className="space-y-1.5">
            <label htmlFor="curation-slug" className="text-xs font-medium">
              {t('pluginsAdminCatalog.form.slug')}
            </label>
            <Input
              id="curation-slug"
              dir="ltr"
              value={values.slug}
              maxLength={40}
              onChange={(event) => {
                setField('slug', event.target.value);
              }}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="curation-publisher" className="text-xs font-medium">
            {t('pluginsAdminCatalog.form.publisher')}
          </label>
          <Input
            id="curation-publisher"
            value={values.publisher}
            maxLength={60}
            onChange={(event) => {
              setField('publisher', event.target.value);
            }}
          />
        </div>
        <AdminCurationSelect
          id="curation-category"
          label={t('pluginsAdminCatalog.form.category')}
          value={values.category}
          options={ADMIN_CURATION_CATEGORIES.map((key) => ({
            value: key,
            label: categoryLabel(t, key),
          }))}
          onChange={(value) => {
            setField('category', value);
          }}
        />
        <AdminCurationSelect
          id="curation-icon"
          label={t('pluginsAdminCatalog.form.icon')}
          value={values.iconKey}
          options={ADMIN_CURATION_ICON_KEYS.map((key) => ({ value: key, label: key }))}
          onChange={(value) => {
            setField('iconKey', value);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="curation-homepage" className="text-xs font-medium">
          {t('pluginsAdminCatalog.form.homepage')}
        </label>
        <Input
          id="curation-homepage"
          type="url"
          dir="ltr"
          value={values.homepageUrl}
          maxLength={ADMIN_CURATION_URL_MAX}
          onChange={(event) => {
            setField('homepageUrl', event.target.value);
          }}
        />
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="space-y-1.5">
          <label htmlFor="curation-url" className="text-xs font-medium">
            {t('pluginsAdminCatalog.form.url')}
          </label>
          <Input
            id="curation-url"
            type="url"
            dir="ltr"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={values.url}
            maxLength={ADMIN_CURATION_URL_MAX}
            placeholder="https://mcp.example.com/mcp"
            onChange={(event) => {
              setField('url', event.target.value);
            }}
          />
          <p className="text-muted-foreground text-xs">{t('pluginsAdminCatalog.form.urlHelp')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AdminCurationSelect
            id="curation-transport"
            label={t('pluginsAdminCatalog.form.transport')}
            value={values.transport}
            options={options(ADMIN_CURATION_TRANSPORTS)}
            onChange={(value) => {
              setField('transport', value === 'sse' ? 'sse' : 'streamable-http');
            }}
          />
          <AdminCurationSelect
            id="curation-auth"
            label={t('pluginsAdminCatalog.form.auth')}
            value={values.authKind}
            options={options(ADMIN_CURATION_AUTH_KINDS)}
            onChange={(value) => {
              const kind = ADMIN_CURATION_AUTH_KINDS.find((item) => item.value === value);
              setField('authKind', kind?.value ?? 'NONE');
            }}
          />
        </div>
        {needsHeader ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="curation-header" className="text-xs font-medium">
                {t('pluginsAdminCatalog.form.headerName')}
              </label>
              <Input
                id="curation-header"
                dir="ltr"
                autoComplete="off"
                value={values.headerName}
                maxLength={64}
                onChange={(event) => {
                  setField('headerName', event.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="curation-probe-key" className="text-xs font-medium">
                {t('pluginsAdminCatalog.form.probeKey')}
              </label>
              <Input
                id="curation-probe-key"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                spellCheck={false}
                value={values.probeCredential}
                maxLength={ADMIN_CURATION_PROBE_KEY_MAX}
                onChange={(event) => {
                  setField('probeCredential', event.target.value);
                }}
              />
            </div>
          </div>
        ) : null}
        {values.authKind === 'OAUTH2_PKCE' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              dir="ltr"
              type="url"
              aria-label={t('pluginsAdminCatalog.form.oauthAuthorize')}
              placeholder={t('pluginsAdminCatalog.form.oauthAuthorize')}
              value={values.oauthAuthorizeUrl}
              maxLength={ADMIN_CURATION_URL_MAX}
              onChange={(event) => {
                setField('oauthAuthorizeUrl', event.target.value);
              }}
            />
            <Input
              dir="ltr"
              type="url"
              aria-label={t('pluginsAdminCatalog.form.oauthToken')}
              placeholder={t('pluginsAdminCatalog.form.oauthToken')}
              value={values.oauthTokenUrl}
              maxLength={ADMIN_CURATION_URL_MAX}
              onChange={(event) => {
                setField('oauthTokenUrl', event.target.value);
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <AdminCurationSelect
          id="curation-locale"
          label={t('pluginsAdminCatalog.form.language')}
          value={state.locale}
          options={ADMIN_CURATION_LOCALES}
          onChange={state.setLocale}
        />
        <Input
          aria-label={t('pluginsAdminCatalog.form.textName')}
          placeholder={t('pluginsAdminCatalog.form.textName')}
          value={text.name}
          maxLength={ADMIN_CURATION_TEXT_MAX.name}
          onChange={(event) => {
            state.setText('name', event.target.value);
          }}
        />
        <Input
          aria-label={t('pluginsAdminCatalog.form.textSummary')}
          placeholder={t('pluginsAdminCatalog.form.textSummary')}
          value={text.summary}
          maxLength={ADMIN_CURATION_TEXT_MAX.summary}
          onChange={(event) => {
            state.setText('summary', event.target.value);
          }}
        />
        <Textarea
          aria-label={t('pluginsAdminCatalog.form.textDescription')}
          placeholder={t('pluginsAdminCatalog.form.textDescription')}
          value={text.description}
          maxLength={ADMIN_CURATION_TEXT_MAX.description}
          onChange={(event) => {
            state.setText('description', event.target.value);
          }}
        />
        <p className="text-muted-foreground text-xs">{t('pluginsAdminCatalog.form.textHelp')}</p>
      </div>

      <AdminCurationToolsEditor state={state} t={t} />

      <div className="space-y-1.5">
        <label htmlFor="curation-plans" className="text-xs font-medium">
          {t('pluginsAdminCatalog.form.plans')}
        </label>
        <Input
          id="curation-plans"
          dir="ltr"
          value={values.allowedPlans}
          onChange={(event) => {
            setField('allowedPlans', event.target.value);
          }}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="curation-notes" className="text-xs font-medium">
          {t('pluginsAdminCatalog.form.notes')}
        </label>
        <Textarea
          id="curation-notes"
          value={values.adminNotes}
          maxLength={ADMIN_CURATION_NOTES_MAX}
          onChange={(event) => {
            setField('adminNotes', event.target.value);
          }}
        />
      </div>

      {state.errorMessage === null ? null : (
        <Alert variant={AlertVariant.Error} description={state.errorMessage} />
      )}
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={state.isSaving || !hasTools}
          onClick={() => {
            state.save(false);
          }}
        >
          {t('pluginsAdminCatalog.form.saveDraft')}
        </Button>
        <Button
          type="button"
          disabled={state.isSaving || !hasTools || !state.previewed}
          title={state.previewed ? undefined : t('pluginsAdminCatalog.form.previewFirst')}
          onClick={() => {
            state.save(true);
          }}
        >
          {t('pluginsAdminCatalog.form.publish')}
        </Button>
      </DialogFooter>
    </form>
  );
}
