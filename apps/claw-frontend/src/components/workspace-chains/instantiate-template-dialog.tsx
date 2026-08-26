'use client';

import { useState } from 'react';

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
import type { InstantiateTemplateDialogProps } from '@/types';

export function InstantiateTemplateDialog({
  open,
  template,
  connectors,
  onClose,
  onSubmit,
  isPending,
  error,
  t,
}: InstantiateTemplateDialogProps): React.ReactElement {
  const [name, setName] = useState('');
  const [connectorSelections, setConnectorSelections] = useState<Record<string, string>>({});

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setName('');
      setConnectorSelections({});
      onClose();
    }
  };

  const handleSubmit = (): void => {
    onSubmit({ name: name.trim(), connectorSelections });
  };

  const canSubmit =
    template !== null &&
    name.trim().length > 0 &&
    template.requiredProviders.every((provider) => connectorSelections[provider] !== undefined);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template?.name ?? ''}</DialogTitle>
          <DialogDescription>{template?.description ?? ''}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="automation-name" className="text-sm font-medium">
              {t('workspaceChains.instantiate.name')}
              <span className="text-destructive ml-1">*</span>
            </label>
            <Input
              id="automation-name"
              value={name}
              placeholder={t('workspaceChains.instantiate.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {template?.requiredProviders.map((provider) => {
            const options = connectors.filter((c) => c.provider === provider);
            return (
              <div key={provider} className="flex flex-col gap-1">
                <label htmlFor={`connector-${provider}`} className="text-sm font-medium">
                  {t('workspaceChains.instantiate.connectorFor', { value: provider })}
                  <span className="text-destructive ml-1">*</span>
                </label>
                <Select
                  value={connectorSelections[provider] ?? ''}
                  onValueChange={(value) =>
                    setConnectorSelections((prev) => ({ ...prev, [provider]: value }))
                  }
                >
                  <SelectTrigger id={`connector-${provider}`}>
                    <SelectValue placeholder={t('workspaceChains.instantiate.selectConnector')} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {options.length === 0 ? (
                  <p className="text-destructive text-xs">
                    {t('workspaceChains.instantiate.noConnector', { value: provider })}
                  </p>
                ) : null}
              </div>
            );
          })}

          {error !== null ? <p className="text-destructive text-xs">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !canSubmit}>
            {isPending
              ? t('workspaceChains.instantiate.creating')
              : t('workspaceChains.instantiate.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
