'use client';

import type { ReactElement } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BOARD_LANGUAGE_CODES } from '@/constants/thread-board-view.constants';
import { THREAD_BOARD_ALL } from '@/constants/thread-board.constants';
import { THREAD_PUBLICATION_OPTIONS } from '@/constants/thread-publication.constants';
import { useTranslation } from '@/lib/i18n';
import type { BoardFiltersProps } from '@/types/thread-board-view.types';
import { boardLanguageLabel } from '@/utilities/thread-board-view.utility';

export function BoardFilters({
  idPrefix,
  lang,
  type,
  onLanguageChange,
  onTypeChange,
}: BoardFiltersProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 @4xl:flex-row @4xl:items-center">
      <Select value={lang} onValueChange={onLanguageChange}>
        <SelectTrigger
          id={`${idPrefix}-lang`}
          aria-label={t('chat.threadBoardFilterLanguage')}
          className="min-h-11 @4xl:w-44"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={THREAD_BOARD_ALL}>{t('chat.threadBoardAllLanguages')}</SelectItem>
          {BOARD_LANGUAGE_CODES.map((code) => (
            <SelectItem key={code} value={code}>
              {boardLanguageLabel(code)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={type} onValueChange={onTypeChange}>
        <SelectTrigger
          id={`${idPrefix}-type`}
          aria-label={t('chat.threadBoardFilterType')}
          className="min-h-11 @4xl:w-48"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={THREAD_BOARD_ALL}>{t('chat.threadBoardAllTypes')}</SelectItem>
          {THREAD_PUBLICATION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {t(option.translationKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
