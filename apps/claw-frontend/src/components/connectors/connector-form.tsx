import { ConnectorFormFields } from '@/components/connectors/connector-form-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useConnectorFormState } from '@/hooks/connectors/use-connector-form-state';
import { useMediaQuery } from '@/hooks/ui/use-media-query';
import { useTranslation } from '@/lib/i18n';
import type { ConnectorFormProps } from '@/types';

export function ConnectorForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  connector,
}: ConnectorFormProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const {
    name,
    setName,
    provider,
    setProvider,
    authType,
    setAuthType,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    region,
    setRegion,
    fieldErrors,
    isEditing,
    pendingLabel,
    submitLabel,
    defaultBaseUrl,
    handleSubmit,
    handleOpenChange,
  } = useConnectorFormState({ open, connector, onSubmit, onOpenChange });

  const title = isEditing ? t('connectors.editConnector') : t('connectors.addConnector');
  const description = isEditing
    ? t('connectors.editConnectorDesc')
    : t('connectors.addConnectorDesc');

  const fields = (
    <ConnectorFormFields
      fieldErrors={fieldErrors}
      isEditing={isEditing}
      name={name}
      setName={setName}
      provider={provider}
      setProvider={setProvider}
      authType={authType}
      setAuthType={setAuthType}
      apiKey={apiKey}
      setApiKey={setApiKey}
      baseUrl={baseUrl}
      setBaseUrl={setBaseUrl}
      region={region}
      setRegion={setRegion}
      defaultBaseUrl={defaultBaseUrl}
    />
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md md:max-w-lg">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <form
            onSubmit={handleSubmit}
            className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto pr-1"
          >
            {fields}
            <SheetFooter className="bg-background sticky bottom-0 -mx-6 mt-auto -mb-6 border-t p-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? pendingLabel : submitLabel}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {fields}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
