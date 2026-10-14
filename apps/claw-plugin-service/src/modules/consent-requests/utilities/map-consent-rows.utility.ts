import { ConsentChoiceKind } from '../../../common/enums/consent-choice.enum';
import { ConsentRequestState } from '../../../common/enums/consent-request-status.enum';
import { RiskLevel } from '../../../common/enums/risk-level.enum';
import {
  type ChatGrantRow,
  type ConsentRequestRow,
  type GrantDbRow,
  type RequestDbRow,
} from '../types/consent-request.types';

export function mapRequestRow(row: RequestDbRow): ConsentRequestRow {
  return {
    ...row,
    riskLevel: RiskLevel[row.riskLevel],
    status: ConsentRequestState[row.status],
    choice: row.choice === null ? null : ConsentChoiceKind[row.choice],
  };
}

export function mapGrantRow(row: GrantDbRow): ChatGrantRow {
  return { ...row, riskLevel: RiskLevel[row.riskLevel] };
}
