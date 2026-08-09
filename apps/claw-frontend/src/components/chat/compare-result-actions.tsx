'use client';

import { Check, Code, Copy, Download, FileText, Maximize2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CompareResultActionsProps } from '@/types';

// Rendered TWICE per compare panel — once above the output and once below it —
// so that on a tall response the user never has to scroll to the far end of the
// card to copy, switch to raw, export or expand. Extracted to its own file
// because `.tsx` files may not declare inline sub-components
// (apps/claw-frontend/CLAUDE.md rule 12a).
export function CompareResultActions({
  isMarkdown,
  copied,
  onToggleViewMode,
  onCopy,
  onExport,
  onExpand,
  className,
  t,
}: CompareResultActionsProps): React.ReactElement {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        onClick={onToggleViewMode}
      >
        {isMarkdown ? (
          <Code className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0" />
        )}
        {isMarkdown ? t('compare.viewRaw') : t('compare.viewMarkdown')}
      </Button>
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onCopy}>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0" />
        )}
        {copied ? t('compare.copied') : t('compare.copy')}
      </Button>
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onExport}>
        <Download className="h-3.5 w-3.5 shrink-0" />
        {t('compare.exportMd')}
      </Button>
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onExpand}>
        <Maximize2 className="h-3.5 w-3.5 shrink-0" />
        {t('compare.expand')}
      </Button>
    </div>
  );
}
