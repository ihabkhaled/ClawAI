import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { PluginAuthKind } from '@/enums/plugin-auth-kind.enum';
import { usePluginSettingsSheet } from '@/hooks/plugins/use-plugin-settings-sheet';
import type { PluginSettingsSheetProps } from '@/types/plugin-installs.types';

import { PluginConsentList } from './plugin-consent-list';
import { PluginCredentialSection } from './plugin-credential-section';
import { PluginSettingsForm } from './plugin-settings-form';

/** Settings, key and consent for one install, in a side sheet that scrolls its own body. */
export function PluginSettingsSheet({
  install,
  onClose,
}: PluginSettingsSheetProps): React.ReactElement {
  const sheet = usePluginSettingsSheet(install);
  const { t } = sheet;
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('pluginsInstall.sheet.title', { value: install.name })}</SheetTitle>
          <SheetDescription>{t('pluginsInstall.sheet.description')}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          {sheet.errorMessage === null ? null : (
            <Alert variant={AlertVariant.Error} description={sheet.errorMessage} />
          )}
          {sheet.isLoading ? <Skeleton className="min-h-24 w-full rounded-lg" /> : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t('pluginsInstall.sheet.settingsTitle')}</h3>
            <PluginSettingsForm
              fields={sheet.fields}
              draft={sheet.draft}
              errors={sheet.errors}
              onChange={sheet.setDraftValue}
              t={t}
            />
            {sheet.fields.length > 0 ? (
              <Button type="button" size="sm" disabled={sheet.isSaving} onClick={sheet.save}>
                {t('pluginsInstall.sheet.save')}
              </Button>
            ) : null}
          </section>

          {install.authKind === PluginAuthKind.ApiKey ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t('pluginsInstall.sheet.credentialTitle')}</h3>
              <PluginCredentialSection install={install} sheet={sheet} />
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t('pluginsInstall.sheet.consentsTitle')}</h3>
            <PluginConsentList
              tools={sheet.plugin?.tools ?? []}
              install={install}
              busy={sheet.isConsentBusy}
              onGrant={sheet.grantConsent}
              onRevoke={sheet.revokeConsent}
              t={t}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
