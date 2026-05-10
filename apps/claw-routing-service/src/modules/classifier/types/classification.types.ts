import { type RiskLevel } from '../../../common/enums';
import { type DomainTag, type ModalityKind, type PrivacyClass } from '../../../generated/prisma';

export type ClassificationResult = {
  domain: DomainTag;
  secondaryDomain: DomainTag | null;
  roleKey: string | null;
  taskFamily: string;
  modalityIn: ModalityKind[];
  modalityOut: ModalityKind[];
  riskLevel: RiskLevel;
  privacyClass: PrivacyClass;
  confidence: number;
  reasonTags: string[];
};

export type ClassifyInput = {
  messageContent: string;
  attachedFileMimeTypes?: string[];
};

export type DomainScore = {
  domain: DomainTag;
  hits: number;
  matchedKeywords: string[];
};

export type ModalityDetection = {
  modalityIn: ModalityKind[];
  modalityOut: ModalityKind[];
  modalityReasons: string[];
};
