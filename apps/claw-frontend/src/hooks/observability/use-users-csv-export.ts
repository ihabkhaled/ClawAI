import { useCallback, useEffect, useState } from 'react';

import { CSV_EXPORT_FILE_NAME, USERS_CSV_COLUMNS } from '@/constants/observability-pages.constants';
import { useObservabilityScope } from '@/hooks/observability/use-observability-scope';
import { observabilityExplorerRepository } from '@/repositories/admin/observability-explorer.repository';
import type { TranslateFunction } from '@/types/i18n.types';
import type { ObservabilityExportQuery } from '@/types/observability-pages-api.types';
import { buildUsersCsv, downloadCsv } from '@/utilities/observability-csv.utility';

/**
 * Downloads the users in the current period, filters, search and ORDER as a CSV.
 * The server caps the export; when it did, `truncated` says so rather than
 * letting a short file pass for the full list. The notice belongs to the export
 * that produced it, so a new export or a change of view clears it.
 */
export function useUsersCsvExport(list: ObservabilityExportQuery, t: TranslateFunction) {
  const { scope, issue } = useObservabilityScope();
  const [isExporting, setIsExporting] = useState(false);
  const [isError, setIsError] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const { search, sort, order } = list;

  useEffect(() => {
    setTruncated(false);
  }, [scope, search, sort, order]);

  const exportCsv = useCallback(async (): Promise<void> => {
    if (issue !== null) {
      return;
    }
    setIsExporting(true);
    setIsError(false);
    setTruncated(false);
    try {
      const result = await observabilityExplorerRepository.exportUsers(scope.buildParams(), {
        search,
        sort,
        order,
      });
      downloadCsv(
        buildUsersCsv(
          result.items,
          USERS_CSV_COLUMNS.map((key) => t(key)),
        ),
        CSV_EXPORT_FILE_NAME,
      );
      setTruncated(result.truncated);
    } catch {
      setIsError(true);
    } finally {
      setIsExporting(false);
    }
  }, [issue, scope, search, sort, order, t]);

  return { exportCsv, isExporting, isError, truncated };
}
