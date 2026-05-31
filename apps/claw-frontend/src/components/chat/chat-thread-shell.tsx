'use client';

import { ArrowLeft, GitCompareArrows, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { EditableTitle } from '@/components/chat/editable-title';
import { InThreadComparePanel } from '@/components/chat/in-thread-compare-panel';
import { MessageComposer } from '@/components/chat/message-composer';
import { ThreadSettings } from '@/components/chat/thread-settings';
import { VirtualizedMessages } from '@/components/chat/virtualized-messages';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import type { ChatThreadShellProps } from '@/types';

// Pure-render shell for /chat/[threadId]. ZERO hook calls. Every piece of
// state and every callback arrives via props built by useThreadDetailPage.
export function ChatThreadShell(props: ChatThreadShellProps): React.ReactElement {
  if (props.isLoadingPlaceholder) {
    return <LoadingSpinner label={props.loadingLabel} />;
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-6">
        <div className="min-w-0">
          <EditableTitle title={props.title} editableTitle={props.editableTitle} />
          {props.thread ? (
            <p className="mt-1 text-muted-foreground">
              {props.thread.routingMode}
              {props.thread.lastModel ? ` · ${props.thread.lastModel}` : ''}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {props.canCompare ? (
            <Button
              variant={props.compareIsOpen ? 'default' : 'outline'}
              size="sm"
              className="min-h-11 min-w-11"
              onClick={props.compareToggleOpen}
            >
              <GitCompareArrows className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">{props.compareLabel}</span>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 min-w-11"
            onClick={props.threadSettingsToggleOpen}
          >
            <Settings className="h-4 w-4 sm:me-2" />
            <span className="hidden sm:inline">{props.threadSettingsLabel}</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="min-h-11 min-w-11"
            onClick={props.handleDelete}
            disabled={props.isDeleting}
          >
            <Trash2 className="h-4 w-4 sm:me-2" />
            <span className="hidden sm:inline">{props.deleteLabel}</span>
          </Button>
          <Button variant="outline" size="sm" className="min-h-11" asChild>
            <Link href={props.backToThreadsHref}>
              <ArrowLeft className="h-4 w-4 sm:me-2 rtl:rotate-180" />
              <span className="hidden sm:inline">{props.backToThreadsLabel}</span>
            </Link>
          </Button>
        </div>
      </div>

      {props.compareIsOpen && props.canCompare ? (
        <InThreadComparePanel {...props.inThreadComparePanelProps} />
      ) : null}

      {props.threadSettingsOpen ? (
        <div className="mb-4">
          <ThreadSettings {...props.threadSettingsProps} />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <div className="min-h-0 flex-1 overflow-hidden">
          <VirtualizedMessages {...props.virtualizedMessagesProps} />
        </div>

        <div className="relative shrink-0 border-t" style={{ height: props.composerHeight }}>
          <button
            type="button"
            aria-label={props.resizeAriaLabel}
            className="absolute inset-x-0 top-0 z-10 flex h-3 cursor-ns-resize items-center justify-center hover:bg-muted/50"
            onMouseDown={props.onResizeHandleMouseDown}
          >
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </button>
          <div className="flex h-full flex-col p-4 pt-3">
            <MessageComposer {...props.composerProps} />
          </div>
        </div>
      </div>
    </div>
  );
}
