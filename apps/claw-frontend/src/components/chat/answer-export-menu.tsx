import { Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ANSWER_EXPORT_OPTIONS } from '@/constants/answer-export.constants';
import { useAnswerExport } from '@/hooks/chat/use-answer-export';
import type { AnswerExportMenuProps } from '@/types/answer-export.types';

/** "Download as" for one AI answer: .md, .txt, .html, .docx or .pdf. */
export function AnswerExportMenu({ content, t }: AnswerExportMenuProps): React.ReactElement {
  const { exportAs, pendingFormat, failed } = useAnswerExport(content);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={failed ? 'text-destructive h-7 w-7 p-0' : 'text-muted-foreground h-7 w-7 p-0'}
          aria-label={failed ? t('chat.exportFailed') : t('chat.exportAnswer')}
          title={failed ? t('chat.exportFailed') : t('chat.exportAnswer')}
          data-testid="answer-export-trigger"
        >
          {pendingFormat === null ? (
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {ANSWER_EXPORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.format}
            disabled={pendingFormat !== null}
            onSelect={() => exportAs(option)}
            data-testid={`answer-export-${option.extension}`}
          >
            {t(option.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
