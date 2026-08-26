'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { FeedbackEditorTab } from '@/enums';
import { useMarkdownToolbar } from '@/hooks/feedback/use-markdown-toolbar';
import { useTranslation } from '@/lib/i18n';
import { MarkdownRenderer } from '@/lib/markdown/markdown-renderer';
import type { FeedbackMarkdownEditorProps } from '@/types/feedback-props.types';

export function FeedbackMarkdownEditor({ value, onChange, error }: FeedbackMarkdownEditorProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<FeedbackEditorTab>(FeedbackEditorTab.WRITE);
  const {
    textareaRef,
    applyBold,
    applyItalic,
    applyBulletList,
    applyNumberedList,
    applyHeading,
    applyLink,
    applyInlineCode,
  } = useMarkdownToolbar(value, onChange);
  const errorId = error ? 'feedback-content-error' : undefined;

  return (
    <div className="space-y-2">
      <div className="border-input bg-muted flex flex-wrap gap-1 rounded-t-md border p-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={applyBold}
          aria-label={t('feedback.editor.bold')}
        >
          <strong>B</strong>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={applyItalic}
          aria-label={t('feedback.editor.italic')}
        >
          <em>I</em>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={applyBulletList}
          aria-label={t('feedback.editor.bulletList')}
        >
          • List
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={applyNumberedList}
          aria-label={t('feedback.editor.numberedList')}
        >
          1. List
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={applyHeading}
          aria-label={t('feedback.editor.heading')}
        >
          H
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={applyLink}
          aria-label={t('feedback.editor.link')}
        >
          Link
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={applyInlineCode}
          aria-label={t('feedback.editor.inlineCode')}
        >
          <code>{`{}`}</code>
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedbackEditorTab)}>
        <TabsList>
          <TabsTrigger value={FeedbackEditorTab.WRITE}>{t('feedback.editor.write')}</TabsTrigger>
          <TabsTrigger value={FeedbackEditorTab.PREVIEW}>
            {t('feedback.editor.preview')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={FeedbackEditorTab.WRITE}>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={errorId}
            className={`min-h-[200px] ${error ? 'border-red-500' : ''}`}
          />
        </TabsContent>
        <TabsContent value={FeedbackEditorTab.PREVIEW}>
          <div className="border-input bg-background min-h-[200px] rounded-md border p-4">
            <MarkdownRenderer content={value} />
          </div>
        </TabsContent>
      </Tabs>
      {error && (
        <p id={errorId} className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
