import { type RiskLevel } from '../../../common/enums';
import { type DomainTag, type ModalityKind, type WorkflowKind } from '../../../generated/prisma';

export type WorkflowSelectorInput = {
  domain: DomainTag;
  modalityIn: ModalityKind[];
  modalityOut: ModalityKind[];
  riskLevel: RiskLevel;
  messageContent: string;
};

export type WorkflowDecision = {
  workflowKind: WorkflowKind;
  judgeRecommended: boolean;
  searchRecommended: boolean;
  compareRecommended: boolean;
  reasonTags: string[];
};
