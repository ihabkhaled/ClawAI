import { Maximize2 } from 'lucide-react';

import { CopyButton } from '@/components/common/copy-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComponentSize } from '@/enums';
import { MarkdownRenderer } from '@/lib/markdown';
import type { AnswerExpandDialogProps } from '@/types/answer-export.types';

/** An AI answer, full size: rendered, or as its raw markdown. */
export function AnswerExpandDialog({ content, t }: AnswerExpandDialogProps): React.ReactElement {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 w-7 p-0"
          aria-label={t('chat.expandAnswer')}
          title={t('chat.expandAnswer')}
          data-testid="answer-expand-trigger"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] w-[min(64rem,95vw)] max-w-none flex-col">
        <DialogHeader>
          <DialogTitle>{t('chat.expandAnswer')}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="rendered" className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="rendered">{t('chat.answerRendered')}</TabsTrigger>
              <TabsTrigger value="raw">{t('chat.answerRaw')}</TabsTrigger>
            </TabsList>
            <CopyButton text={content} size={ComponentSize.SM} label={t('chat.copyMessage')} />
          </div>
          <TabsContent
            value="rendered"
            className="min-h-0 flex-1 overflow-y-auto"
            data-testid="answer-rendered"
          >
            <MarkdownRenderer content={content} />
          </TabsContent>
          <TabsContent value="raw" className="min-h-0 flex-1 overflow-y-auto">
            <pre
              className="bg-muted rounded-md p-4 font-mono text-xs break-words whitespace-pre-wrap"
              dir="auto"
              data-testid="answer-raw"
            >
              {content}
            </pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
