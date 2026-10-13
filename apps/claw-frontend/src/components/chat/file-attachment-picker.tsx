import { Paperclip } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComposerControlVariant } from '@/enums';
import { useFileAttachmentPicker } from '@/hooks/chat/use-file-attachment-picker';
import { cn } from '@/lib/utils';
import type { FileAttachmentPickerProps } from '@/types';

import { FileLibraryDialog } from './file-library-dialog';
import { FileLibraryMenu } from './file-library-menu';

export function FileAttachmentPicker({
  selectedFileIds,
  onChange,
  disabled,
  variant = ComposerControlVariant.Default,
  showLabel,
  ingestFiles,
  isUploading,
}: FileAttachmentPickerProps): React.ReactElement {
  const ctrl = useFileAttachmentPicker({ selectedFileIds });
  const { t } = ctrl;

  // Phase 2 mobile composer redesign — `compact` shrinks the trigger to a
  // Square icon button with optional inline label. `default` keeps the
  // historical pill button (icon + "Attach files" label hidden under sm).
  const isCompact = variant === ComposerControlVariant.Compact;
  const triggerClass = isCompact
    ? cn(
        'border-border/60 relative h-9 shrink-0 gap-1 rounded-xl px-2 text-xs',
        showLabel ? 'min-w-[6.5rem]' : 'w-9 justify-center px-0',
      )
    : 'relative h-9 gap-1 text-xs';
  const renderTriggerLabel = isCompact ? showLabel === true : true;

  return (
    <>
      <Popover open={ctrl.menuOpen} onOpenChange={ctrl.setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={triggerClass}
            disabled={disabled}
            aria-label={isCompact && !showLabel ? t('chat.attachFiles') : undefined}
            data-tour="composer-attach"
          >
            <Paperclip className={cn('shrink-0', isCompact ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
            {renderTriggerLabel ? (
              <span className={isCompact ? 'inline' : 'hidden sm:inline'}>
                {t('chat.attachFiles')}
              </span>
            ) : null}
            {ctrl.selectedCount > 0 ? (
              <Badge
                variant="secondary"
                className={cn(
                  'touch:text-xs h-5 min-w-5 px-1 text-[10px]',
                  isCompact && !showLabel ? 'absolute -end-1 -top-1' : 'ms-1',
                )}
              >
                {ctrl.selectedCount}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          ref={ctrl.contentRef}
          align="start"
          onOpenAutoFocus={ctrl.handleOpenAutoFocus}
          className="touch:w-[min(22rem,calc(100vw-1rem))] w-[min(22rem,calc(100vw-1rem))] p-0"
        >
          <FileLibraryMenu
            selectedFileIds={selectedFileIds}
            onChange={onChange}
            ingestFiles={ingestFiles}
            isUploading={isUploading === true}
            disabled={disabled}
            onDone={ctrl.closeMenu}
            onBrowseAll={ctrl.openLibrary}
          />
        </PopoverContent>
      </Popover>
      <FileLibraryDialog
        open={ctrl.libraryOpen}
        onOpenChange={ctrl.setLibraryOpen}
        selectedFileIds={selectedFileIds}
        onChange={onChange}
        ingestFiles={ingestFiles}
        isUploading={isUploading === true}
        disabled={disabled}
      />
    </>
  );
}
