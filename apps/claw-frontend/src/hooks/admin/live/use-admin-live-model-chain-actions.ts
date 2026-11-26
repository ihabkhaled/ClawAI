import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { LiveModelChainDirection, LiveModelChainKind } from '@/enums/live-model-chain.enum';
import type {
  LiveModelRef,
  LivePolicyFormValues,
  UseAdminLiveModelChainActionsResult,
} from '@/types/live-admin.types';
import {
  liveModelChainAdd,
  liveModelChainMove,
  liveModelChainRemove,
  liveModelChainSet,
  liveModelRefFromValue,
} from '@/utilities/live-model-chain.utility';

/** Edits the policy form's model chains: pick, move, remove, add (within the server's limits). */
export function useAdminLiveModelChainActions(
  setValues: Dispatch<SetStateAction<LivePolicyFormValues | null>>,
  clearInvalid: () => void,
): UseAdminLiveModelChainActionsResult {
  const change = useCallback(
    (kind: LiveModelChainKind, edit: (chain: LiveModelRef[]) => LiveModelRef[]): void => {
      setValues((current) =>
        current === null
          ? current
          : {
              ...current,
              modelChains: { ...current.modelChains, [kind]: edit(current.modelChains[kind]) },
            },
      );
      clearInvalid();
    },
    [clearInvalid, setValues],
  );

  return useMemo(
    () => ({
      setChainModel: (kind: LiveModelChainKind, index: number, value: string | null) => {
        const ref = liveModelRefFromValue(value);
        if (ref !== null) {
          change(kind, (chain) => liveModelChainSet(chain, index, ref));
        }
      },
      moveChainRow: (kind: LiveModelChainKind, index: number, direction: LiveModelChainDirection) =>
        change(kind, (chain) => liveModelChainMove(chain, index, direction)),
      removeChainRow: (kind: LiveModelChainKind, index: number) =>
        change(kind, (chain) => liveModelChainRemove(kind, chain, index)),
      addChainRow: (kind: LiveModelChainKind) =>
        change(kind, (chain) => liveModelChainAdd(kind, chain)),
    }),
    [change],
  );
}
