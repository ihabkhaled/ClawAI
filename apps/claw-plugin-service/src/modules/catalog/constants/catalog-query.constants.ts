import { CatalogStatus } from '../../../common/enums/catalog-status.enum';

export const VISIBLE_ENTRY_WHERE = {
  status: CatalogStatus.PUBLISHED,
  globallyEnabled: true,
  currentVersionId: { not: null },
};
