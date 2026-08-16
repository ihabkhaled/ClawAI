import { useCallback, useState } from 'react';

import {
  SMART_ROUTER_TAB_OVERVIEW,
  SMART_ROUTER_TAB_REVISION_DETAIL,
} from '@/constants/smart-router-admin.constants';
import { RouterConfigurationStatus } from '@/enums/router-configuration.enum';
import { useTranslation } from '@/lib/i18n';
import type {
  ChainEntryInput,
  UseSmartRouterAdminPageResult,
} from '@/types/smart-router-admin.types';
import {
  buildEntriesWithAppendedEntry,
  buildEntriesWithoutEntry,
  buildReorderedEntries,
  diffRouterConfigurations,
} from '@/utilities';

import { useSmartRouterConfigurationDetail } from './use-smart-router-configuration-detail';
import { useSmartRouterCreateDraft } from './use-smart-router-create-draft';
import { useSmartRouterDraftSummary } from './use-smart-router-draft-summary';
import { useSmartRouterPublish } from './use-smart-router-publish';
import { useSmartRouterPublishedSummary } from './use-smart-router-published-summary';
import { useSmartRouterRevisionsList } from './use-smart-router-revisions-list';
import { useSmartRouterSetEnabled } from './use-smart-router-set-enabled';
import { useSmartRouterUpdateEntries } from './use-smart-router-update-entries';

export function useSmartRouterAdminPage(): UseSmartRouterAdminPageResult {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(SMART_ROUTER_TAB_OVERVIEW);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [compareFromId, setCompareFromId] = useState<string | null>(null);
  const [compareToId, setCompareToId] = useState<string | null>(null);

  const publishedSummary = useSmartRouterPublishedSummary();
  const draftSummary = useSmartRouterDraftSummary();
  const revisionsList = useSmartRouterRevisionsList();
  const setEnabled = useSmartRouterSetEnabled();
  const createDraft = useSmartRouterCreateDraft();
  const updateEntries = useSmartRouterUpdateEntries();
  const publish = useSmartRouterPublish();

  const chainTargetId = draftSummary.draft?.id ?? publishedSummary.published?.id ?? null;
  const chainDetail = useSmartRouterConfigurationDetail(chainTargetId);
  const revisionDetail = useSmartRouterConfigurationDetail(selectedRevisionId);
  const compareFromDetail = useSmartRouterConfigurationDetail(compareFromId);
  const compareToDetail = useSmartRouterConfigurationDetail(compareToId);

  const handleReorder = useCallback(
    (id: string, entries: ChainEntryInput[]) => updateEntries.updateEntries(id, entries),
    [updateEntries],
  );

  const handleSelectRevision = useCallback((id: string): void => {
    setSelectedRevisionId(id);
    setActiveTab(SMART_ROUTER_TAB_REVISION_DETAIL);
  }, []);

  const diff =
    compareFromDetail.configuration !== null && compareToDetail.configuration !== null
      ? diffRouterConfigurations(compareFromDetail.configuration, compareToDetail.configuration)
      : null;

  return {
    t,
    locale,
    activeTab,
    setActiveTab,
    overview: {
      published: publishedSummary.published,
      isLoading: publishedSummary.isLoading,
      isError: publishedSummary.isError,
      error: publishedSummary.error,
      isTogglePending: setEnabled.isPending,
      onToggleEnabled: setEnabled.setEnabled,
    },
    chain: {
      configuration: chainDetail.configuration,
      isLoading: chainDetail.isLoading,
      isError: chainDetail.isError,
      error: chainDetail.error,
      isDraft: chainDetail.configuration?.status === RouterConfigurationStatus.DRAFT,
      isUpdatePending: updateEntries.isPending,
      onReorder: (entryId, targetOrder) => {
        if (chainDetail.configuration === null) {
          return;
        }
        handleReorder(
          chainDetail.configuration.id,
          buildReorderedEntries(chainDetail.configuration.entries, entryId, targetOrder),
        );
      },
      onRemove: (entryId) => {
        if (chainDetail.configuration === null) {
          return;
        }
        handleReorder(
          chainDetail.configuration.id,
          buildEntriesWithoutEntry(chainDetail.configuration.entries, entryId),
        );
      },
      onAdd: (input) => {
        if (chainDetail.configuration === null) {
          return;
        }
        handleReorder(
          chainDetail.configuration.id,
          buildEntriesWithAppendedEntry(chainDetail.configuration.entries, input),
        );
      },
      onCreateDraft: createDraft.createDraft,
      isCreateDraftPending: createDraft.isPending,
    },
    revisions: {
      revisions: revisionsList.revisions,
      meta: revisionsList.meta,
      statusFilter: revisionsList.statusFilter,
      onStatusFilterChange: revisionsList.setStatusFilter,
      page: revisionsList.page,
      onPageChange: revisionsList.setPage,
      isLoading: revisionsList.isLoading,
      isError: revisionsList.isError,
      error: revisionsList.error,
      selectedRevisionId,
      onSelectRevision: handleSelectRevision,
      onCreateDraft: createDraft.createDraft,
      isCreateDraftPending: createDraft.isPending,
    },
    revisionDetail: {
      configuration: revisionDetail.configuration,
      isLoading: revisionDetail.isLoading,
      isError: revisionDetail.isError,
      error: revisionDetail.error,
      isEditable: revisionDetail.configuration?.status === RouterConfigurationStatus.DRAFT,
      isUpdatePending: updateEntries.isPending,
      onReorder: (entryId, targetOrder) => {
        if (revisionDetail.configuration === null) {
          return;
        }
        handleReorder(
          revisionDetail.configuration.id,
          buildReorderedEntries(revisionDetail.configuration.entries, entryId, targetOrder),
        );
      },
      onRemove: (entryId) => {
        if (revisionDetail.configuration === null) {
          return;
        }
        handleReorder(
          revisionDetail.configuration.id,
          buildEntriesWithoutEntry(revisionDetail.configuration.entries, entryId),
        );
      },
      onAdd: (input) => {
        if (revisionDetail.configuration === null) {
          return;
        }
        handleReorder(
          revisionDetail.configuration.id,
          buildEntriesWithAppendedEntry(revisionDetail.configuration.entries, input),
        );
      },
    },
    publish: {
      configuration: revisionDetail.configuration,
      isLoading: revisionDetail.isLoading,
      currentlyPublished: publishedSummary.published,
      isPublishable: revisionDetail.configuration?.status === RouterConfigurationStatus.DRAFT,
      isPending: publish.isPending,
      onPublish: () => {
        if (revisionDetail.configuration !== null) {
          publish.publish(revisionDetail.configuration.id);
        }
      },
    },
    compare: {
      revisions: revisionsList.revisions,
      fromId: compareFromId,
      toId: compareToId,
      onFromChange: setCompareFromId,
      onToChange: setCompareToId,
      diff,
      isLoading: compareFromDetail.isLoading || compareToDetail.isLoading,
    },
  };
}
