'use client';

import { BookText, Brain, Eye, FolderOpen, Globe, Layers, Plus } from 'lucide-react';

import { ComposerContextPackPicker } from '@/components/chat/composer-context-pack-picker';
import { ComposerPlusMenuItem } from '@/components/chat/composer-plus-menu-item';
import { ComposerPlusMenuSection } from '@/components/chat/composer-plus-menu-section';
import { ComposerPlusSubPanel } from '@/components/chat/composer-plus-sub-panel';
import { ComposerResearchPanel } from '@/components/chat/composer-research-panel';
import { FileLibraryMenu } from '@/components/chat/file-library-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  COMPOSER_PLUS_LIBRARY_FIT_CLASS,
  COMPOSER_PLUS_POPOVER_WIDTH_CLASS,
} from '@/constants/composer-plus-menu.constants';
import { ComposerContextDialog } from '@/enums/composer-context-dialog.enum';
import { ComposerPlusMenuView as View } from '@/enums/composer-plus-menu-view.enum';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ComposerPlusMenuViewProps } from '@/types/composer-plus-menu.types';
import { resolveResearchModeLabel } from '@/utilities/research-mode-label.utility';

/**
 * The grouped "+" menu: Attach, Context and Tools behind one round button. Pure render;
 * state lives in useComposerPlusMenu. Dialogs the rows open are rendered by the parent,
 * outside this popover, so they outlive the menu closing.
 */
export function ComposerPlusMenuView(props: ComposerPlusMenuViewProps): React.ReactElement {
  const { menu, context, disabled, research } = props;
  const { t } = useTranslation();
  const modeLabel = resolveResearchModeLabel(research.mode, t);
  // A thread's picker saves as you pick; a thread-less surface holds the choice for its run.
  const packs = context?.picker ?? props.draftPacks;
  const packsCount = packs?.selectedCount ?? 0;
  const badgeCount = props.selectedFileIds.length + packsCount;
  const triggerLabel =
    badgeCount > 0
      ? t('chat.composerMenu.addLabelWithCount', { value: String(badgeCount) })
      : t('chat.composerMenu.addLabel');

  return (
    <Popover open={menu.open} onOpenChange={menu.onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          aria-label={triggerLabel}
          title={triggerLabel}
          data-tour="composer-attach"
          className="relative h-9 w-9 shrink-0 rounded-full"
        >
          <Plus className="size-4" aria-hidden="true" />
          {badgeCount > 0 ? (
            <Badge
              className="absolute -end-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]"
              aria-hidden="true"
            >
              {badgeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={menu.contentRef}
        side="top"
        align="start"
        tabIndex={-1}
        aria-label={t('chat.composerMenu.addLabel')}
        onKeyDown={menu.onKeyDown}
        onOpenAutoFocus={menu.onOpenAutoFocus}
        className={cn(
          'max-h-[min(70dvh,var(--radix-popover-content-available-height))]',
          COMPOSER_PLUS_POPOVER_WIDTH_CLASS,
          COMPOSER_PLUS_LIBRARY_FIT_CLASS,
        )}
      >
        {menu.view === View.MAIN ? (
          <div className="divide-border flex flex-col divide-y">
            <ComposerPlusMenuSection title={t('chat.composerMenu.sectionAttach')}>
              <FileLibraryMenu
                selectedFileIds={props.selectedFileIds}
                onChange={props.onSelectedFileIdsChange}
                ingestFiles={props.ingestFiles}
                isUploading={props.isUploadingAttachment}
                disabled={disabled}
                onDone={menu.closeMenu}
                onBrowseAll={menu.openLibrary}
              />
            </ComposerPlusMenuSection>
            {packs === undefined ? null : (
              <ComposerPlusMenuSection title={t('chat.composerMenu.sectionContext')}>
                <ComposerPlusMenuItem
                  icon={Layers}
                  label={t('chat.composerContext.pickLabel')}
                  hint={
                    packsCount > 0
                      ? t('chat.composerMenu.packsSelected', { value: String(packsCount) })
                      : t('chat.composerMenu.packsHint')
                  }
                  opensPanel
                  returnKey={View.PACKS}
                  dataTour="composer-context"
                  onClick={() => menu.showView(View.PACKS)}
                />
                {context === null ? null : (
                  <>
                    <ComposerPlusMenuItem
                      icon={FolderOpen}
                      label={t('chat.composerContext.viewLabel')}
                      hint={t('chat.composerMenu.viewHint')}
                      onClick={() => {
                        menu.closeMenu();
                        context.openDialog(ComposerContextDialog.VIEW);
                      }}
                    />
                    <ComposerPlusMenuItem
                      icon={Brain}
                      label={t('chat.composerContext.memoryLabel')}
                      hint={t('chat.composerMenu.memoryHint')}
                      onClick={() => {
                        menu.closeMenu();
                        context.openDialog(ComposerContextDialog.MEMORY);
                      }}
                    />
                    <ComposerPlusMenuItem
                      icon={Eye}
                      label={t('preview.openLabel')}
                      hint={t('chat.composerMenu.previewHint')}
                      dataTour="composer-preview-context"
                      onClick={menu.openPreview}
                    />
                  </>
                )}
              </ComposerPlusMenuSection>
            )}
            <ComposerPlusMenuSection title={t('chat.composerMenu.sectionTools')}>
              {props.canResearch ? (
                <ComposerPlusMenuItem
                  icon={Globe}
                  label={t('chat.composerMenu.researchLabel')}
                  hint={t('chat.composerMenu.researchHint')}
                  trailing={modeLabel}
                  opensPanel
                  returnKey={View.RESEARCH}
                  onClick={() => menu.showView(View.RESEARCH)}
                />
              ) : null}
              <ComposerPlusMenuItem
                icon={BookText}
                label={t('promptLibrary.openLabel')}
                hint={t('chat.composerMenu.promptsHint')}
                dataTour="composer-prompts"
                onClick={menu.openPrompts}
              />
            </ComposerPlusMenuSection>
          </div>
        ) : null}
        {menu.view === View.RESEARCH ? (
          <ComposerPlusSubPanel
            title={t('chat.composerMenu.researchLabel')}
            onBack={menu.backToMain}
          >
            <ComposerResearchPanel
              value={research}
              providers={props.researchProviders}
              isProvidersLoading={props.isResearchProvidersLoading}
              onChange={props.onResearchChange}
              disabled={disabled}
            />
          </ComposerPlusSubPanel>
        ) : null}
        {menu.view === View.PACKS && packs !== undefined ? (
          <ComposerPlusSubPanel
            title={t('chat.composerContext.menuLabel')}
            onBack={menu.backToMain}
          >
            <div className="p-2">
              <ComposerContextPackPicker picker={packs} />
            </div>
          </ComposerPlusSubPanel>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
