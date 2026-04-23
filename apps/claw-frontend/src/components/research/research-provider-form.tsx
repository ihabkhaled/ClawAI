'use client';

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
import { RESEARCH_PROVIDER_KINDS, RESEARCH_PROVIDER_LABELS } from '@/constants/research.constants';
import type { ResearchProviderKind } from '@/enums/research-provider-kind.enum';
import { useTranslation } from '@/lib/i18n';
import type { ResearchProviderFormProps } from '@/types';

export function ResearchProviderForm({
  open,
  onOpenChange,
  form,
  onSetField,
  onSubmit,
  isPending,
  error,
}: ResearchProviderFormProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('research.providers.createTitle')}</DialogTitle>
          <DialogDescription>{t('research.providers.createDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="rp-kind" className="text-sm font-medium">
              {t('research.providers.kind')}
            </label>
            <Select
              value={form.kind}
              onValueChange={(value) => onSetField('kind', value as ResearchProviderKind)}
            >
              <SelectTrigger id="rp-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESEARCH_PROVIDER_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {RESEARCH_PROVIDER_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rp-name" className="text-sm font-medium">
              {t('research.providers.name')}
            </label>
            <Input
              id="rp-name"
              value={form.name}
              onChange={(e) => onSetField('name', e.target.value)}
              placeholder="Tavily production"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rp-base" className="text-sm font-medium">
              {t('research.providers.baseUrl')}
            </label>
            <Input
              id="rp-base"
              value={form.baseUrl}
              onChange={(e) => onSetField('baseUrl', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rp-key" className="text-sm font-medium">
              {t('research.providers.apiKey')}
            </label>
            <Input
              id="rp-key"
              type="password"
              value={form.apiKey}
              onChange={(e) => onSetField('apiKey', e.target.value)}
            />
          </div>
          {error !== null ? (
            <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={isPending || form.name.trim().length === 0}>
            {isPending ? t('research.providers.creating') : t('research.providers.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
