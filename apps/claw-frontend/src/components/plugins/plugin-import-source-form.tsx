import { GitBranch, Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PLUGIN_IMPORT_ACCEPT,
  PLUGIN_IMPORT_SOURCE_MAX_LENGTH,
} from '@/constants/plugin-import.constants';
import { PluginImportSourceMode } from '@/enums/plugin-import-source-mode.enum';
import type { PluginImportSourceFormProps } from '@/types/plugin-import.types';

/** Choose where the plugin comes from: a GitHub address or an uploaded .zip / .tgz. */
export function PluginImportSourceForm({
  form,
  setMode,
  setSource,
  setFile,
  canPreview,
  busy,
  onPreview,
  t,
}: PluginImportSourceFormProps): React.ReactElement {
  const isGithub = form.mode === PluginImportSourceMode.Github;
  return (
    <form
      className="space-y-4 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onPreview();
      }}
    >
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t('pluginImport.source.label')}
      >
        <Button
          type="button"
          size="sm"
          variant={isGithub ? 'default' : 'outline'}
          aria-pressed={isGithub}
          onClick={() => {
            setMode(PluginImportSourceMode.Github);
          }}
        >
          <GitBranch className="me-2 h-4 w-4" aria-hidden="true" />
          {t('pluginImport.source.github')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isGithub ? 'outline' : 'default'}
          aria-pressed={!isGithub}
          onClick={() => {
            setMode(PluginImportSourceMode.Upload);
          }}
        >
          <Upload className="me-2 h-4 w-4" aria-hidden="true" />
          {t('pluginImport.source.upload')}
        </Button>
      </div>

      {isGithub ? (
        <div className="space-y-1.5">
          <label htmlFor="plugin-import-source" className="text-sm font-medium">
            {t('pluginImport.source.githubLabel')}
          </label>
          <Input
            id="plugin-import-source"
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            value={form.source}
            maxLength={PLUGIN_IMPORT_SOURCE_MAX_LENGTH}
            placeholder="owner/repo"
            aria-describedby="plugin-import-source-help"
            onChange={(event) => {
              setSource(event.target.value);
            }}
          />
          <p id="plugin-import-source-help" className="text-muted-foreground text-xs">
            {t('pluginImport.source.githubHelp')}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="plugin-import-file" className="text-sm font-medium">
            {t('pluginImport.source.uploadLabel')}
          </label>
          <Input
            id="plugin-import-file"
            type="file"
            accept={PLUGIN_IMPORT_ACCEPT}
            aria-describedby="plugin-import-file-help"
            onChange={(event) => {
              setFile(event.target.files?.[0]);
            }}
          />
          <p id="plugin-import-file-help" className="text-muted-foreground text-xs">
            {t('pluginImport.source.uploadHelp')}
          </p>
        </div>
      )}

      <Button type="submit" disabled={!canPreview}>
        {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {busy ? t('pluginImport.source.previewing') : t('pluginImport.source.preview')}
      </Button>
    </form>
  );
}
