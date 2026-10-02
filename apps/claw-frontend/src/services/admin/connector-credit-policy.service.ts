// connector-credit-policy.service.ts
// Thin service module — no React, no component code.

import {
  CONNECTOR_LIST_MAX_PAGE_SIZE,
  CREDIT_POLICY_MAX_PAGES,
} from '@/constants/model-billing.constants';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import type { Connector } from '@/types/connector.types';

/**
 * Every connector, for the credit roll-up. GET /connectors defaults to 20 rows
 * a page, so a single call would silently drop connectors from the roll-up and
 * show a credit model as "Included". Pages are bounded by
 * CREDIT_POLICY_MAX_PAGES so a wrong totalPages cannot loop.
 */
export async function fetchAllConnectorsForCreditPolicy(): Promise<Connector[]> {
  const all: Connector[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await connectorRepository.getConnectors({
      page: String(page),
      limit: String(CONNECTOR_LIST_MAX_PAGE_SIZE),
    });
    all.push(...response.data);
    totalPages = response.meta.totalPages;
    page += 1;
  } while (page <= totalPages && page <= CREDIT_POLICY_MAX_PAGES);
  return all;
}
