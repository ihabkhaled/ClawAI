'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

import { EvidenceViewer } from '@/components/research/evidence-viewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';
import type { ResearchEvidenceBundle, ResearchRunDetailsProps } from '@/types';
import { formatLatency, getResearchRunFromMessage } from '@/utilities';

export function ResearchRunDetails({
  message,
}: ResearchRunDetailsProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const researchRun = getResearchRunFromMessage(message);

  if (researchRun === null || !('items' in researchRun.bundle)) {
    return null;
  }

  const bundle = researchRun.bundle as ResearchEvidenceBundle;
  const selection = bundle.providerSelection;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-7 px-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <Search className="me-1 h-3.5 w-3.5" />
        {t('research.results.open')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('research.results.title')}</DialogTitle>
            <DialogDescription>{t('research.results.description')}</DialogDescription>
          </DialogHeader>

          <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{researchRun.workflow}</Badge>
            <Badge variant="outline">{researchRun.bundle.mode}</Badge>
            <Badge variant="outline">
              {t('research.results.provider')}: {selection.providerName ?? t('common.unknown')}
            </Badge>
            <Badge variant="outline">
              {t('research.results.selectionMode')}:{' '}
              {selection.selectionMode === 'auto'
                ? t('research.results.selectionAuto')
                : t('research.results.selectionExplicit')}
            </Badge>
            {selection.fallbackUsed ? (
              <Badge variant="outline">{t('research.results.fallbackUsed')}</Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded border p-3">
              <div className="text-muted-foreground text-xs font-medium">
                {t('research.results.query')}
              </div>
              <p className="mt-1 text-sm">{researchRun.intent}</p>
            </div>
            <div className="rounded border p-3">
              <div className="text-muted-foreground text-xs font-medium">
                {t('research.results.evidenceCount')}
              </div>
              <p className="mt-1 text-sm">{bundle.items.length}</p>
            </div>
          </div>

          <div className="rounded border p-3">
            <div className="text-muted-foreground mb-2 text-xs font-medium">
              {t('research.results.attempts')}
            </div>
            <p className="text-sm">
              {selection.attemptedProviders.length > 0
                ? selection.attemptedProviders.join(' -> ')
                : t('common.notAvailable')}
            </p>
          </div>

          <EvidenceViewer bundle={bundle} t={t} />

          <div className="rounded border p-3">
            <div className="text-muted-foreground mb-2 text-xs font-medium">
              {t('research.results.trace')}
            </div>
            <div className="flex flex-col gap-2">
              {researchRun.trace.map((entry, index) => (
                <div
                  key={`${entry.phase}-${index.toString()}`}
                  className="border-muted bg-muted/30 rounded border p-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{entry.phase}</Badge>
                    <Badge variant="outline">{entry.status}</Badge>
                    {entry.latencyMs !== null ? (
                      <span className="text-muted-foreground text-xs">
                        {formatLatency(entry.latencyMs)}
                      </span>
                    ) : null}
                  </div>
                  {entry.message !== null ? <p className="mt-1 text-sm">{entry.message}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
