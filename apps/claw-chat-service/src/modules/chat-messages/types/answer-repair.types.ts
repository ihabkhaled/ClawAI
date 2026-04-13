import type { RepairType } from '../../../common/enums/repair-type.enum';

export type RepairRequest = {
  originalContent: string;
  repairTypes: RepairType[];
};

export type RepairResult = {
  repairedContent: string;
  repairTypes: RepairType[];
  provider: string;
  model: string;
  latencyMs: number;
};

export type AnswerRepairResponse = {
  messageId: string;
  threadId: string;
};
