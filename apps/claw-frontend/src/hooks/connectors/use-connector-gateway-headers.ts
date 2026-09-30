import { useCallback, useState } from 'react';

import type { ConnectorGatewayHeadersHookReturn, GatewayHeaderRow } from '@/types';
import { createGatewayHeaderRow } from '@/utilities/connector-gateway-headers.utility';

/**
 * Editor state for a connector's LLM-gateway headers (F092). The stored values
 * are write-only — connector-service never returns them — so the editor always
 * starts empty; on edit, submitting no rows keeps what is stored and
 * `clearStored` sends `{}` to remove it.
 */
export function useConnectorGatewayHeaders(): ConnectorGatewayHeadersHookReturn {
  const [rows, setRows] = useState<GatewayHeaderRow[]>([]);
  const [clearStored, setClearStored] = useState(false);

  const addRow = useCallback((): void => {
    setRows((prev) => [...prev, createGatewayHeaderRow()]);
  }, []);

  const updateRow = useCallback(
    (id: string, patch: Partial<Omit<GatewayHeaderRow, 'id'>>): void => {
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    },
    [],
  );

  const removeRow = useCallback((id: string): void => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const reset = useCallback((): void => {
    setRows([]);
    setClearStored(false);
  }, []);

  return { rows, addRow, updateRow, removeRow, clearStored, setClearStored, reset };
}
