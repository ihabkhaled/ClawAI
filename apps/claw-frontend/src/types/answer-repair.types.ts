import type { RepairType } from '@/enums/repair-type.enum';
import type { TranslateFunction } from '@/types/i18n.types';

export type RepairRequest = {
  messageId?: string;
  content?: string;
  threadId?: string;
  repairTypes: RepairType[];
  targetProvider?: string;
  targetModel?: string;
};

export type RepairResponse = {
  messageId: string;
  threadId: string;
};

export type RepairMetadata = {
  repaired: true;
  repairTypes: RepairType[];
  repairProvider: string;
  repairModel: string;
};

export type RepairResultState = {
  content: string;
  metadata: RepairMetadata;
};

export type UseRepairSendResult = {
  send: (data: RepairRequest) => void;
  result: RepairResponse | undefined;
  isPending: boolean;
  isError: boolean;
};

export type UseRepairPollResult = {
  repairMessage: RepairResultState | null;
  isPolling: boolean;
  isRepairReady: boolean;
  handleViewInThread: () => void;
};

export type UseRepairPageReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (value: string) => void;
  selectedRepairTypes: RepairType[];
  handleToggleRepairType: (type: RepairType) => void;
  targetProvider: string | undefined;
  targetModel: string | undefined;
  handleSend: () => void;
  isPending: boolean;
  isError: boolean;
  canSend: boolean;
  repairMessage: RepairResultState | null;
  isPolling: boolean;
  isRepairReady: boolean;
  handleViewInThread: () => void;
};
