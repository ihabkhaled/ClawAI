import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SMART_ROUTER_PROVIDER_LABEL_KEYS,
  SMART_ROUTER_PROVIDER_OPTIONS,
} from '@/constants/smart-router-admin.constants';
import type { RouterProvider } from '@/enums/router-configuration.enum';
import { useAssistantModelAddForm } from '@/hooks/admin/use-assistant-model-add-form';
import type { SmartRouterAssistantAddFormProps } from '@/types/smart-router-admin.types';

/** Adds one candidate to the end of a role's list. The model is picked from the
 * real catalog for the chosen provider, so an unreachable name cannot be
 * configured in the first place. */
export function SmartRouterAssistantAddForm({
  onAdd,
  isPending,
  t,
}: SmartRouterAssistantAddFormProps): React.ReactElement {
  const { provider, setProvider, modelAlias, setModelAlias, modelOptions, buildInput, reset } =
    useAssistantModelAddForm();

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const input = buildInput();
    if (input === null) {
      return;
    }
    onAdd(input);
    reset();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <p className="text-sm font-medium">{t('smartRouterAdmin.assistant.addCandidateTitle')}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="assistant-model-provider" className="text-sm font-medium">
                {t('smartRouterAdmin.entryForm.provider')}
              </label>
              <Select
                value={provider}
                onValueChange={(value: string) => setProvider(value as RouterProvider)}
              >
                <SelectTrigger id="assistant-model-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SMART_ROUTER_PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(SMART_ROUTER_PROVIDER_LABEL_KEYS[option])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="assistant-model-alias" className="text-sm font-medium">
                {t('smartRouterAdmin.entryForm.modelAlias')}
              </label>
              <Select value={modelAlias} onValueChange={setModelAlias}>
                <SelectTrigger id="assistant-model-alias" disabled={modelOptions.length === 0}>
                  <SelectValue
                    placeholder={t('smartRouterAdmin.entryForm.modelAliasPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={option.id} value={option.providerModelId}>
                      {option.providerModelId}
                      {option.isValidated
                        ? ''
                        : ` · ${t('smartRouterAdmin.entryForm.modelUnvalidatedSuffix')}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modelOptions.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t('smartRouterAdmin.entryForm.noModelsForProvider')}
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <Button type="submit" disabled={isPending || modelAlias.length === 0}>
              {t('smartRouterAdmin.assistant.addCandidateSubmit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
