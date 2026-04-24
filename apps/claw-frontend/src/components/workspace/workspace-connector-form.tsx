import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WorkspaceProvider } from '@/enums';
import type { WorkspacePermissionLevel } from '@/enums';
import { useWorkspaceConnectorFormState } from '@/hooks/workspace/use-workspace-connector-form-state';
import { workspacePermissionLevels } from '@/lib/validation/workspace-connector.schema';
import type { WorkspaceConnectorFormProps } from '@/types/workspace.types';
import { formatWorkspaceOptionLabel } from '@/utilities/workspace.utility';

const providerOptions = Object.values(WorkspaceProvider);

export function WorkspaceConnectorForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  t,
}: WorkspaceConnectorFormProps): React.ReactElement {
  const {
    name,
    setName,
    provider,
    setProvider,
    permissionLevel,
    setPermissionLevel,
    fieldErrors,
    pendingLabel,
    submitLabel,
    handleSubmit,
    handleOpenChange,
  } = useWorkspaceConnectorFormState({ open, onSubmit, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('workspaceConnectors.createConnector')}</DialogTitle>
          <DialogDescription>{t('workspaceConnectors.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="workspace-connector-name" className="text-sm font-medium">
              {t('workspaceConnectors.name')}
            </label>
            <Input
              id="workspace-connector-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('workspaceConnectors.namePlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('workspaceConnectors.nameHelp')}</p>
            {fieldErrors.name ? (
              <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="workspace-connector-provider" className="text-sm font-medium">
              {t('workspaceConnectors.provider')}
            </label>
            <Select
              value={provider}
              onValueChange={(value) => setProvider(value as WorkspaceProvider)}
            >
              <SelectTrigger id="workspace-connector-provider">
                <SelectValue placeholder={t('workspaceConnectors.provider')} />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatWorkspaceOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('workspaceConnectors.providerHelp')}</p>
            {fieldErrors.provider ? (
              <p className="text-sm text-destructive">{fieldErrors.provider[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="workspace-connector-permission" className="text-sm font-medium">
              {t('workspaceConnectors.permissionLevel')}
            </label>
            <Select
              value={permissionLevel}
              onValueChange={(value) => setPermissionLevel(value as WorkspacePermissionLevel)}
            >
              <SelectTrigger id="workspace-connector-permission">
                <SelectValue placeholder={t('workspaceConnectors.permissionLevel')} />
              </SelectTrigger>
              <SelectContent>
                {workspacePermissionLevels.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatWorkspaceOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('workspaceConnectors.permissionLevelHelp')}
            </p>
            {fieldErrors.permissionLevel ? (
              <p className="text-sm text-destructive">{fieldErrors.permissionLevel[0]}</p>
            ) : null}
          </div>

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
